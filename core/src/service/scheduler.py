import heapq
import time
from collections import Counter, defaultdict
from dataclasses import dataclass

from src.api.schemas import Lesson, ScheduleRequest
from src.exceptions import InvalidRequestError, NoSolutionError, ScheduleTimeoutError

_DAYS = 6
_LESSON_NUMBERS = range(1, 8)
_MAX_PER_DAY = 4

_W_GROUP_WINDOW = 10
_W_TEACHER_WINDOW = 3
_W_EARLY = 2
_W_LATE = 3
_W_OVERLOAD = 5


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


class _Scheduler:
    """Жадный поиск с доменами, MRV, выбором слота по штрафу и откатами."""

    def __init__(self, request: ScheduleRequest) -> None:
        """Заводит домены и индексы."""
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

        self._chosen_teacher: dict[tuple[int, int], int] = {}
        self._teacher_load: Counter[int] = Counter()
        self._group_day: dict[tuple[int, int], set[int]] = defaultdict(set)
        self._teacher_day: dict[tuple[int, int], set[int]] = defaultdict(set)
        self._busy_rooms: set[tuple[int, _Slot]] = set()
        self.schedule: dict[_Pair, _Placement] = {}

        order = sorted(pairs, key=lambda p: (len(self._teachers_for[p.subject_id]), p.group_id, p.subject_id))
        self._rank = {p: i for i, p in enumerate(order)}
        self._queue: list[tuple[int, int, _Pair]] = []
        for p in pairs:
            self._push(p)

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
            teacher = self._free_teacher(pair, slot)
            room = self._free_room(pair, slot) if teacher is not None else None
            if room is not None:
                result.append(_Placement(slot, teacher, room))
        result.sort(key=lambda pl: (self._penalty(pair, pl), pl.slot.day, pl.slot.lesson_number))
        return result

    def _place(self, pair: _Pair, pl: _Placement) -> tuple[tuple, bool]:
        """Ставит пару и вычёркивает слот у соседей. Возвращает, что откатывать, и тупик ли это."""
        slot, t = pl.slot, pl.teacher_id
        key = (pair.group_id, pair.subject_id)
        new_teacher = key not in self._chosen_teacher
        if new_teacher:
            self._chosen_teacher[key] = t
        self._remaining.discard(pair)
        self.schedule[pair] = pl
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
        del self.schedule[pair]
        self._teacher_load[t] -= 1
        self._group_day[(pair.group_id, slot.day)].discard(slot.lesson_number)
        self._teacher_day[(t, slot.day)].discard(slot.lesson_number)
        self._busy_rooms.discard((pl.classroom_id, slot))
        for p in {p for p, _ in removed}:
            self._push(p)

    def solve(self, time_limit_s: float) -> None:
        """Поиск в глубину на явном стеке, без рекурсии."""
        deadline = time.monotonic() + time_limit_s
        first = self._next_pair()
        if first is None:
            return
        stack = [_Frame(first, self._options(first))]
        while stack:
            if time.monotonic() > deadline:
                raise ScheduleTimeoutError(f"не уложились в {time_limit_s:g} с")
            frame = stack[-1]
            if frame.applied is not None:
                self._unplace(frame.pair, frame.options[frame.next_option - 1], frame.applied)
                frame.applied = None
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


def validate_request(request: ScheduleRequest) -> None:
    """Проверяет ссылки и очевидные противоречия до запуска генерации."""
    subjects = {s.id: s for s in request.subjects}
    groups = {g.id: g for g in request.groups}
    errors = []
    for ts in request.teacher_subjects:
        if ts.subject_id not in subjects:
            errors.append(f"teacher_subjects: нет дисциплины {ts.subject_id}")
    teachable = {ts.subject_id for ts in request.teacher_subjects}
    max_capacity = max((c.capacity for c in request.classrooms), default=0)
    load: Counter[int] = Counter()
    seen = set()
    for gs in request.group_subjects:
        key = (gs.group_id, gs.subject_id)
        if gs.group_id not in groups:
            errors.append(f"group_subjects: нет группы {gs.group_id}")
        elif gs.subject_id not in subjects:
            errors.append(f"group_subjects: нет дисциплины {gs.subject_id}")
        elif gs.subject_id not in teachable:
            errors.append(f"дисциплину {gs.subject_id} никто не может вести")
        elif key in seen:
            errors.append(f"группа {gs.group_id} изучает дисциплину {gs.subject_id} дважды")
        else:
            load[gs.group_id] += subjects[gs.subject_id].weekly_number_of_lessons
        seen.add(key)
    for group in request.groups:
        if group.size > max_capacity:
            errors.append(f"для группы {group.id} нет аудитории на {group.size} человек")
        if load[group.id] > len(_SLOTS):
            errors.append(f"у группы {group.id} {load[group.id]} пар в неделю при {len(_SLOTS)} слотах")
    if errors:
        raise InvalidRequestError("; ".join(errors))


def build_schedule(request: ScheduleRequest, time_limit_s: float) -> list[Lesson]:
    """Строит расписание на неделю."""
    scheduler = _Scheduler(request)
    scheduler.solve(time_limit_s)
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
            scheduler.schedule.items(), key=lambda x: (x[0].group_id, x[1].slot.day, x[1].slot.lesson_number)
        )
    ]
