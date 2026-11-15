--
-- PostgreSQL database dump
--

\restrict K0agiefk7tiTXntG8vStVCLlcZuEkaMsES7Vmv02R8aqJasKvxBeWZdjwfBChfl

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-11-15 14:19:44

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5118 (class 0 OID 16431)
-- Dependencies: 224
-- Data for Name: classrooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classrooms (id, capacity, room_number) FROM stdin;
1	30	101
2	30	102
3	24	201
4	24	202
5	18	Л-1
6	18	Л-2
7	60	А-301
8	40	А-302
\.


--
-- TOC entry 5116 (class 0 OID 16411)
-- Dependencies: 222
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.groups (id, group_name) FROM stdin;
1	ИВТ-101
2	ИВТ-102
3	ПМИ-201
4	ПМИ-202
\.


--
-- TOC entry 5120 (class 0 OID 16440)
-- Dependencies: 226
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subjects (id, name, weekly_number_of_lessons) FROM stdin;
1	Математический анализ	2
2	Линейная алгебра	2
3	Программирование	3
4	Базы данных	2
5	Дискретная математика	2
6	Алгоритмы и структуры данных	2
7	Операционные системы	2
8	Физика	2
\.


--
-- TOC entry 5114 (class 0 OID 16398)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, role, name, login, email, password_hash, group_id) FROM stdin;
1	admin	Администратор системы	admin	admin@example.edu	demo_hash_admin	\N
2	teacher	Анна Смирнова	t_smirnova	a.smirnova@example.edu	demo_hash_01	\N
3	teacher	Борис Иванов	t_ivanov	b.ivanov@example.edu	demo_hash_02	\N
4	teacher	Вера Петрова	t_petrova	v.petrova@example.edu	demo_hash_03	\N
5	teacher	Глеб Соколов	t_sokolov	g.sokolov@example.edu	demo_hash_04	\N
6	teacher	Дарья Кузнецова	t_kuznetsova	d.kuznetsova@example.edu	demo_hash_05	\N
7	teacher	Егор Волков	t_volkov	e.volkov@example.edu	demo_hash_06	\N
8	student	Студент ИВТ-101	s_ivt101	s.ivt101@example.edu	demo_hash_s1	1
9	student	Студент ИВТ-102	s_ivt102	s.ivt102@example.edu	demo_hash_s2	2
10	student	Студент ПМИ-201	s_pmi201	s.pmi201@example.edu	demo_hash_s3	3
11	student	Студент ПМИ-202	s_pmi202	s.pmi202@example.edu	demo_hash_s4	4
\.


--
-- TOC entry 5122 (class 0 OID 16451)
-- Dependencies: 228
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teachers (id, name, user_id) FROM stdin;
1	Анна Смирнова	2
2	Борис Иванов	3
3	Вера Петрова	4
4	Глеб Соколов	5
5	Дарья Кузнецова	6
6	Егор Волков	7
\.


--
-- TOC entry 5125 (class 0 OID 16492)
-- Dependencies: 231
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lessons (id, date, lesson_number, group_id, teacher_id, classroom_id, lesson_type, subject_id) FROM stdin;
1	2026-11-09	1	1	1	1	lection	1
3	2026-11-09	1	2	2	3	lection	3
5	2026-11-09	1	3	3	5	lection	1
7	2026-11-09	1	4	4	7	lection	2
2	2026-11-09	2	1	1	2	practice	2
4	2026-11-09	2	2	2	4	practice	6
6	2026-11-09	2	3	3	6	practice	4
8	2026-11-09	2	4	4	8	practice	3
9	2026-11-10	1	1	1	1	lection	2
11	2026-11-10	1	2	2	3	lection	6
13	2026-11-10	1	3	3	5	lection	4
15	2026-11-10	1	4	4	7	lection	3
10	2026-11-10	2	1	1	2	practice	5
12	2026-11-10	2	2	2	4	practice	7
14	2026-11-10	2	3	3	6	practice	8
16	2026-11-10	2	4	4	8	practice	5
17	2026-11-11	1	1	1	1	lection	5
19	2026-11-11	1	2	2	3	lection	7
21	2026-11-11	1	3	3	5	lection	8
23	2026-11-11	1	4	4	7	lection	5
18	2026-11-11	2	1	1	2	practice	1
20	2026-11-11	2	2	2	4	practice	3
22	2026-11-11	2	3	3	6	practice	1
24	2026-11-11	2	4	4	8	practice	2
25	2026-11-12	1	1	1	1	lection	1
27	2026-11-12	1	2	2	3	lection	3
29	2026-11-12	1	3	3	5	lection	1
31	2026-11-12	1	4	4	7	lection	2
26	2026-11-12	2	1	1	2	practice	2
28	2026-11-12	2	2	2	4	practice	6
30	2026-11-12	2	3	3	6	practice	4
32	2026-11-12	2	4	4	8	practice	3
33	2026-11-13	1	1	1	1	lection	2
35	2026-11-13	1	2	2	3	lection	6
37	2026-11-13	1	3	3	5	lection	4
39	2026-11-13	1	4	4	7	lection	3
34	2026-11-13	2	1	1	2	practice	5
36	2026-11-13	2	2	2	4	practice	7
38	2026-11-13	2	3	3	6	practice	8
40	2026-11-13	2	4	4	8	practice	5
\.


--
-- TOC entry 5128 (class 0 OID 16566)
-- Dependencies: 234
-- Data for Name: lessons_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lessons_versions (id, name, creation_time, status) FROM stdin;
1	Расписание на неделю — опубликованное	2026-11-01 09:00:00+03	published
2	Черновик оптимизации №1	2026-11-05 12:00:00+03	draft
3	Архивная версия — предыдущая неделя	2026-10-25 09:00:00+03	archived
\.


--
-- TOC entry 5129 (class 0 OID 16580)
-- Dependencies: 235
-- Data for Name: lesson_version_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_version_items (lesson_id, version_id) FROM stdin;
1	1
3	1
5	1
7	1
2	1
4	1
6	1
8	1
9	1
11	1
13	1
15	1
10	1
12	1
14	1
16	1
17	1
19	1
21	1
23	1
18	1
20	1
22	1
24	1
25	1
27	1
29	1
31	1
26	1
28	1
30	1
32	1
33	1
35	1
37	1
39	1
34	1
36	1
38	1
40	1
1	2
3	2
5	2
7	2
2	2
4	2
6	2
8	2
9	2
11	2
13	2
15	2
10	2
12	2
14	2
16	2
17	2
19	2
21	2
23	2
18	2
20	2
22	2
24	2
25	2
27	2
29	2
31	2
26	2
28	2
30	2
32	2
33	2
35	2
37	2
39	2
34	2
36	2
38	2
40	2
1	3
3	3
5	3
7	3
2	3
4	3
6	3
8	3
9	3
11	3
13	3
15	3
10	3
12	3
14	3
16	3
17	3
19	3
18	3
20	3
\.


--
-- TOC entry 5132 (class 0 OID 16621)
-- Dependencies: 238
-- Data for Name: penalties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.penalties (id, penalty_name) FROM stdin;
1	Окна в расписании преподавателя
2	Занятия в нежелательное время
3	Превышение учебной нагрузки в день
4	Неравномерное распределение занятий по дням
5	Использование неподходящей аудитории
6	Нарушение предпочтений преподавателя
\.


--
-- TOC entry 5133 (class 0 OID 16630)
-- Dependencies: 239
-- Data for Name: lessons_versions_penalties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lessons_versions_penalties (lessons_versions_id, penalty_id, weight) FROM stdin;
1	1	10
1	2	8
1	3	5
1	4	4
1	5	10
1	6	7
2	1	15
2	2	8
2	3	5
2	4	4
2	5	10
2	6	12
3	1	10
3	2	6
3	3	5
3	4	5
3	5	8
3	6	6
\.


--
-- TOC entry 5130 (class 0 OID 16597)
-- Dependencies: 236
-- Data for Name: published_scedule_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.published_scedule_version (id, lessons_versions_id) FROM stdin;
1	1
\.


--
-- TOC entry 5123 (class 0 OID 16467)
-- Dependencies: 229
-- Data for Name: teacher_subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teacher_subjects (teacher_id, subject_id) FROM stdin;
1	1
1	2
1	5
2	3
2	6
2	7
3	1
3	4
3	8
4	2
4	3
4	5
5	4
5	6
5	7
6	3
6	8
\.


--
-- TOC entry 5127 (class 0 OID 16542)
-- Dependencies: 233
-- Data for Name: teachers_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teachers_preferences (id, teacher_id, day_of_week, lesson_number, preference_weight) FROM stdin;
1	1	1	1	10
2	1	2	1	5
3	1	3	2	-5
4	1	4	1	10
5	2	1	2	5
6	2	2	1	-10
7	2	3	1	10
8	2	5	2	5
9	3	1	1	-5
10	3	2	2	10
11	3	4	1	5
12	3	5	1	10
13	4	1	2	10
14	4	3	1	5
15	4	4	2	-10
16	4	5	1	5
17	5	2	1	10
18	5	3	2	5
19	6	4	1	10
20	6	5	2	-5
\.


--
-- TOC entry 5139 (class 0 OID 0)
-- Dependencies: 223
-- Name: classrooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classrooms_id_seq', 8, true);


--
-- TOC entry 5140 (class 0 OID 0)
-- Dependencies: 221
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.groups_id_seq', 4, true);


--
-- TOC entry 5141 (class 0 OID 0)
-- Dependencies: 237
-- Name: penaltyes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.penaltyes_id_seq', 6, true);


--
-- TOC entry 5142 (class 0 OID 0)
-- Dependencies: 230
-- Name: schelude_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schelude_id_seq', 40, true);


--
-- TOC entry 5143 (class 0 OID 0)
-- Dependencies: 225
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subjects_id_seq', 8, true);


--
-- TOC entry 5144 (class 0 OID 0)
-- Dependencies: 227
-- Name: teachers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teachers_id_seq', 6, true);


--
-- TOC entry 5145 (class 0 OID 0)
-- Dependencies: 232
-- Name: teachers_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teachers_preferences_id_seq', 20, true);


--
-- TOC entry 5146 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 11, true);


-- Completed on 2026-11-15 14:19:44

--
-- PostgreSQL database dump complete
--

\unrestrict K0agiefk7tiTXntG8vStVCLlcZuEkaMsES7Vmv02R8aqJasKvxBeWZdjwfBChfl

