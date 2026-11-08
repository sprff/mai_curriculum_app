import heapq
import random
import time
from collections import Counter, defaultdict
from dataclasses import dataclass
from threading import Event
from typing import Callable

from src.exceptions import BacktrackBudgetError, NoSolutionError, ScheduleCancelledError, ScheduleTimeoutError
from src.schemas import Lesson, ScheduleRequest

_DAYS = 6
_LESSON_NUMBERS = range(1, 8)
_MAX_PER_DAY = 4

_W_GROUP_WINDOW = 10
_W_TEACHER_WINDOW = 3
_W_EARLY = 2
_W_LATE = 3
_W_OVERLOAD = 5

_FIRST_BUDGET = 2000
_BUDGET_GROWTH = 1.5


@dataclass(frozen=True)
class _Pair:
    """Одна пара: дисциплина с weekly_number_of_lessons = 3 даёт три пары."""

    group_id: int
    subject_id: int
    index: int


@dataclass(frozen=True)
class _Slot:
    """День недели и номер пары."""

    day: int
    lesson_number: int


@dataclass(frozen=True)
class _Placement:
    """Куда поставлена пара."""

    slot: _Slot
    teacher_id: int
    classroom_id: int


_SLOTS = [_Slot(d, n) for d in range(_DAYS) for n in _LESSON_NUMBERS]


@dataclass
class _Frame:
    """Пара в стеке поиска: её варианты и какой сейчас применён."""

    pair: _Pair
    options: list[_Placement]
    next_option: int = 0
    applied: tuple | None = None


def _windows(numbers: set[int]) -> int:
    """Пустые пары между первой и последней парой дня."""
    return max(numbers) - min(numbers) + 1 - len(numbers) if numbers else 0


class Scheduler:
    """Генератор недельного расписания.

    Поиск с возвратом: пары ставятся по одной, у каждой хранится домен свободных слотов,
    следующей берётся пара с самым узким доменом (MRV), слот выбирается по минимальному штрафу.
    Если попытка упирается в лимит откатов, поиск начинается заново со случайным разбиением ничьих.
    """

    def __init__(self, time_limit_s: float = 120) -> None:
        """time_limit_s: лимит времени на одну генерацию."""
        self._time_limit_s = time_limit_s

    def build(
        self,
        request: ScheduleRequest,
        progress_callback: Callable[[int, int], None] | None = None,
        cancel_event: Event | None = None,
    ) -> list[Lesson]:
        """Строит расписание на неделю и при необходимости сообщает прогресс"""
        deadline = time.monotonic() + self._time_limit_s

        # Сохраняем колбэк и сигнал отмены для проверки во время поиска
        self._progress_callback = progress_callback
        self._cancel_event = cancel_event
        self._last_progress_at = float("-inf")
        self._deadline = deadline

        budget, seed = _FIRST_BUDGET, 0
        while True:
            self._check_stop()
            self._reset(request, seed)
            self._report_progress()
            try:
                self._search(deadline, budget)
                break
            except BacktrackBudgetError:
                seed += 1
                budget = int(budget * _BUDGET_GROWTH)

        # Отменённую задачу нельзя считать успешно завершённой
        self._check_stop()
        return [
            Lesson(
                day=pl.slot.day,
                lesson_number=pl.slot.lesson_number,
                group_id=pair.group_id,
                subject_id=pair.subject_id,
                teacher_id=pl.teacher_id,
                classroom_id=pl.classroom_id,
            )
            for pair, pl in sorted(
                self._schedule.items(), key=lambda x: (x[0].group_id, x[1].slot.day, x[1].slot.lesson_number)
            )
        ]

    def _reset(self, request: ScheduleRequest, seed: int) -> None:
        """Заводит домены и индексы. seed > 0 случайно разбивает ничьи при выборе пары и слота."""
        self._rng = random.Random(seed)
        self._noise = seed > 0
        self._rooms = sorted(request.classrooms, key=lambda c: c.capacity)
        self._group_size = {g.id: g.size for g in request.groups}
        self._teachers_for: dict[int, list[int]] = defaultdict(list)
        for ts in request.teacher_subjects:
            self._teachers_for[ts.subject_id].append(ts.teacher_id)
        weekly = {s.id: s.weekly_number_of_lessons for s in request.subjects}
        pairs = [
            _Pair(gs.group_id, gs.subject_id, i)
            for gs in request.group_subjects
            for i in range(weekly[gs.subject_id])
        ]

        self._domain = {p: set(_SLOTS) for p in pairs}
        self._remaining = set(pairs)
        self._pairs_of_group: dict[int, list[_Pair]] = defaultdict(list)
        self._pairs_of_subject: dict[tuple[int, int], list[_Pair]] = defaultdict(list)
        for p in pairs:
            self._pairs_of_group[p.group_id].append(p)
            self._pairs_of_subject[(p.group_id, p.subject_id)].append(p)
        self._pairs_of_teacher: dict[int, set[_Pair]] = defaultdict(set)
        self._pairs_by_size = sorted(pairs, key=lambda p: self._group_size[p.group_id], reverse=True)

        self._chosen_teacher: dict[tuple[int, int], int] = {}
        self._teacher_load: Counter[int] = Counter()
        self._group_day: dict[tuple[int, int], set[int]] = defaultdict(set)
        self._teacher_day: dict[tuple[int, int], set[int]] = defaultdict(set)
        self._busy_rooms: set[tuple[int, _Slot]] = set()
        self._schedule: dict[_Pair, _Placement] = {}

        # Общее число пар остаётся тем же даже при откатах поиска
        self._total_pairs = len(pairs)

        jitter = {p: self._tie() for p in pairs}
        order = sorted(
            pairs, key=lambda p: (len(self._teachers_for[p.subject_id]), jitter[p], p.group_id, p.subject_id)
        )
        self._rank = {p: i for i, p in enumerate(order)}
        self._queue: list[tuple[int, int, _Pair]] = []
        for p in pairs:
            self._push(p)

    def _check_stop(self) -> None:
        """Проверяет отмену и время выполнения"""
        if self._cancel_event is not None and self._cancel_event.is_set():
            raise ScheduleCancelledError("генерация отменена")

        if time.monotonic() > self._deadline:
            raise ScheduleTimeoutError(f"не уложились в {self._time_limit_s:g} с")

    def _report_progress(self) -> None:
        """Передаёт количество поставленных пар не чаще раза в 0,5 секунды"""
        if self._progress_callback is None:
            return

        now = time.monotonic()
        if now - self._last_progress_at < 0.5:
            return

        # При откате количество поставленных пар может уменьшаться
        self._last_progress_at = now
        self._progress_callback(len(self._schedule), self._total_pairs)

    def _tie(self) -> float:
        """Случайная добавка для разбиения ничьих, 0 в первой попытке."""
        return self._rng.random() if self._noise else 0.0

    def _push(self, pair: _Pair) -> None:
        """Кладёт пару в очередь с текущим размером домена."""
        heapq.heappush(self._queue, (len(self._domain[pair]), self._rank[pair], pair))

    def _next_pair(self) -> _Pair | None:
        """Пара с наименьшим доменом, устаревшие записи очереди пропускаются."""
        while self._queue:
            size, _, pair = heapq.heappop(self._queue)
            if pair in self._remaining and size == len(self._domain[pair]):
                return pair
        return None

    def _free_room(self, pair: _Pair, slot: _Slot) -> int | None:
        """Самая маленькая свободная аудитория, куда влезает группа."""
        size = self._group_size[pair.group_id]
        for room in self._rooms:
            if room.capacity >= size and (room.id_number, slot) not in self._busy_rooms:
                return room.id_number
        return None

    def _biggest_free_room(self, slot: _Slot) -> int:
        """Вместимость самой большой свободной аудитории в слоте, 0 если свободных нет."""
        for room in reversed(self._rooms):
            if (room.id_number, slot) not in self._busy_rooms:
                return room.capacity
        return 0

    def _free_teacher(self, pair: _Pair, slot: _Slot) -> int | None:
        """Уже выбранный препод группы, если свободен, иначе наименее загруженный свободный."""
        chosen = self._chosen_teacher.get((pair.group_id, pair.subject_id))
        candidates = [chosen] if chosen is not None else self._teachers_for[pair.subject_id]
        free = [t for t in candidates if slot.lesson_number not in self._teacher_day[(t, slot.day)]]
        return min(free, key=self._teacher_load.__getitem__, default=None)

    def _penalty(self, pair: _Pair, placement: _Placement) -> int:
        """Насколько вырастет штраф, если поставить пару сюда."""
        slot = placement.slot
        n = slot.lesson_number
        g = self._group_day[(pair.group_id, slot.day)]
        t = self._teacher_day[(placement.teacher_id, slot.day)]
        cost = _W_GROUP_WINDOW * (_windows(g | {n}) - _windows(g))
        cost += _W_TEACHER_WINDOW * (_windows(t | {n}) - _windows(t))
        cost += _W_EARLY * (n == 1) + _W_LATE * (n >= 6)
        cost += _W_OVERLOAD * (len(g) >= _MAX_PER_DAY) + len(g)
        return cost

    def _options(self, pair: _Pair) -> list[_Placement]:
        """Слоты из домена со свободным преподом и аудиторией, лучшие первыми."""
        result = []
        for slot in self._domain[pair]:
            self._check_stop()
            teacher = self._free_teacher(pair, slot)
            room = self._free_room(pair, slot) if teacher is not None else None
            if room is not None:
                result.append(_Placement(slot, teacher, room))
        keyed = [
            (self._penalty(pair, pl), self._tie(), pl.slot.day, pl.slot.lesson_number, pl) for pl in result
        ]
        keyed.sort(key=lambda x: x[:4])
        return [x[4] for x in keyed]

    def _place(self, pair: _Pair, pl: _Placement) -> tuple[tuple, bool]:
        """Ставит пару и вычёркивает слот у соседей. Возвращает, что откатывать, и тупик ли это."""
        slot, t = pl.slot, pl.teacher_id
        key = (pair.group_id, pair.subject_id)
        new_teacher = key not in self._chosen_teacher
        if new_teacher:
            self._chosen_teacher[key] = t
        self._remaining.discard(pair)
        self._schedule[pair] = pl
        self._report_progress()
        self._teacher_load[t] += 1
        self._group_day[(pair.group_id, slot.day)].add(slot.lesson_number)
        self._teacher_day[(t, slot.day)].add(slot.lesson_number)
        self._busy_rooms.add((pl.classroom_id, slot))

        removed: list[tuple[_Pair, _Slot]] = []
        touched: set[_Pair] = set()

        def _drop(p: _Pair, s: _Slot) -> None:
            """Вычёркивает слот из домена пары."""
            if s in self._domain[p]:
                self._domain[p].discard(s)
                removed.append((p, s))
                touched.add(p)

        for p in self._pairs_of_group[pair.group_id]:
            if p in self._remaining:
                _drop(p, slot)
        siblings = [p for p in self._pairs_of_subject[key] if p in self._remaining]
        for p in siblings:
            for s in [s for s in self._domain[p] if s.day == slot.day]:
                _drop(p, s)
        if new_teacher:
            self._pairs_of_teacher[t].update(siblings)
            for p in siblings:
                for s in [s for s in self._domain[p] if s.lesson_number in self._teacher_day[(t, s.day)]]:
                    _drop(p, s)
        for p in self._pairs_of_teacher[t]:
            if p in self._remaining:
                _drop(p, slot)
        biggest_free = self._biggest_free_room(slot)
        for p in self._pairs_by_size:
            if self._group_size[p.group_id] <= biggest_free:
                break
            if p in self._remaining:
                _drop(p, slot)

        for p in touched:
            self._push(p)
        return (new_teacher, removed), any(not self._domain[p] for p in touched)

    def _unplace(self, pair: _Pair, pl: _Placement, applied: tuple) -> None:
        """Снимает пару и возвращает вычеркнутое."""
        new_teacher, removed = applied
        slot, t = pl.slot, pl.teacher_id
        key = (pair.group_id, pair.subject_id)
        for p, s in removed:
            self._domain[p].add(s)
        if new_teacher:
            del self._chosen_teacher[key]
            self._pairs_of_teacher[t].difference_update(self._pairs_of_subject[key])
        self._remaining.add(pair)
        del self._schedule[pair]
        self._report_progress()
        self._teacher_load[t] -= 1
        self._group_day[(pair.group_id, slot.day)].discard(slot.lesson_number)
        self._teacher_day[(t, slot.day)].discard(slot.lesson_number)
        self._busy_rooms.discard((pl.classroom_id, slot))
        for p in {p for p, _ in removed}:
            self._push(p)

    def _search(self, deadline: float, max_backtracks: int) -> None:
        """Поиск в глубину на явном стеке, без рекурсии, с лимитом откатов на попытку."""
        backtracks = 0
        first = self._next_pair()
        if first is None:
            return
        stack = [_Frame(first, self._options(first))]
        while stack:
            # Каждый шаг поиска проверяет, не попросили ли остановить задачу
            self._check_stop()
            frame = stack[-1]
            if frame.applied is not None:
                self._unplace(frame.pair, frame.options[frame.next_option - 1], frame.applied)
                frame.applied = None
                backtracks += 1
                if backtracks > max_backtracks:
                    raise BacktrackBudgetError
            if frame.next_option == len(frame.options):
                stack.pop()
                self._push(frame.pair)
                continue
            placement = frame.options[frame.next_option]
            frame.next_option += 1
            frame.applied, dead_end = self._place(frame.pair, placement)
            if dead_end:
                continue
            pair = self._next_pair()
            if pair is None:
                return
            stack.append(_Frame(pair, self._options(pair)))
        raise NoSolutionError("расписания с такими данными не существует")
