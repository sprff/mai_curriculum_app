--
-- PostgreSQL database dump
--

\restrict fz0HOLH6AxbKn3jDJV1zrT9P4ggkQbKCxAAD1OJByDXg9Ub312OiMXAY4MJYVjA

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-11-14 13:24:46

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
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 5134 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 893 (class 1247 OID 16485)
-- Name: lesson_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.lesson_type AS ENUM (
    'lection',
    'practice',
    'lab work'
);


ALTER TYPE public.lesson_type OWNER TO postgres;

--
-- TOC entry 872 (class 1247 OID 16390)
-- Name: order_roles; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_roles AS ENUM (
    'admin',
    'teacher',
    'student'
);


ALTER TYPE public.order_roles OWNER TO postgres;

--
-- TOC entry 911 (class 1247 OID 16612)
-- Name: version_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.version_status AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE public.version_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 16431)
-- Name: classrooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classrooms (
    id integer NOT NULL,
    capacity integer,
    room_number character varying(10)
);


ALTER TABLE public.classrooms OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16430)
-- Name: classrooms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classrooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.classrooms_id_seq OWNER TO postgres;

--
-- TOC entry 5135 (class 0 OID 0)
-- Dependencies: 223
-- Name: classrooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classrooms_id_seq OWNED BY public.classrooms.id;


--
-- TOC entry 222 (class 1259 OID 16411)
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    group_name text
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16410)
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.groups_id_seq OWNER TO postgres;

--
-- TOC entry 5136 (class 0 OID 0)
-- Dependencies: 221
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- TOC entry 235 (class 1259 OID 16580)
-- Name: lesson_version_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_version_items (
    lesson_id integer NOT NULL,
    version_id integer NOT NULL
);


ALTER TABLE public.lesson_version_items OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16492)
-- Name: lessons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lessons (
    id integer CONSTRAINT schelude_id_not_null NOT NULL,
    date date CONSTRAINT schelude_date_not_null NOT NULL,
    lesson_number integer CONSTRAINT schelude_lesson_number_not_null NOT NULL,
    group_id integer CONSTRAINT schelude_group_id_not_null NOT NULL,
    teacher_id integer CONSTRAINT schelude_teacher_id_not_null NOT NULL,
    classroom_id integer CONSTRAINT schelude_classroom_id_not_null NOT NULL,
    lesson_type public.lesson_type,
    subject_id integer NOT NULL,
    CONSTRAINT lesson_number_constraint CHECK (((lesson_number >= 1) AND (lesson_number <= 7)))
);


ALTER TABLE public.lessons OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16566)
-- Name: lessons_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lessons_versions (
    id integer NOT NULL,
    name text NOT NULL,
    creation_time timestamp with time zone DEFAULT now() NOT NULL,
    status public.version_status DEFAULT 'draft'::public.version_status
);


ALTER TABLE public.lessons_versions OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16630)
-- Name: lessons_versions_penalties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lessons_versions_penalties (
    lessons_versions_id integer NOT NULL,
    penalty_id integer NOT NULL,
    weight integer NOT NULL
);


ALTER TABLE public.lessons_versions_penalties OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16621)
-- Name: penalties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.penalties (
    id integer CONSTRAINT penaltyes_id_not_null NOT NULL,
    penalty_name text
);


ALTER TABLE public.penalties OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16620)
-- Name: penaltyes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.penaltyes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.penaltyes_id_seq OWNER TO postgres;

--
-- TOC entry 5137 (class 0 OID 0)
-- Dependencies: 237
-- Name: penaltyes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.penaltyes_id_seq OWNED BY public.penalties.id;


--
-- TOC entry 236 (class 1259 OID 16597)
-- Name: published_scedule_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.published_scedule_version (
    id smallint DEFAULT 1 NOT NULL,
    lessons_versions_id integer NOT NULL,
    CONSTRAINT published_scedule_version_id_check CHECK ((id = 1))
);


ALTER TABLE public.published_scedule_version OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16491)
-- Name: schelude_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schelude_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schelude_id_seq OWNER TO postgres;

--
-- TOC entry 5138 (class 0 OID 0)
-- Dependencies: 230
-- Name: schelude_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schelude_id_seq OWNED BY public.lessons.id;


--
-- TOC entry 226 (class 1259 OID 16440)
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    name text NOT NULL,
    weekly_number_of_lessons integer
);


ALTER TABLE public.subjects OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16439)
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subjects_id_seq OWNER TO postgres;

--
-- TOC entry 5139 (class 0 OID 0)
-- Dependencies: 225
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- TOC entry 229 (class 1259 OID 16467)
-- Name: teacher_subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teacher_subjects (
    teacher_id integer NOT NULL,
    subject_id integer NOT NULL
);


ALTER TABLE public.teacher_subjects OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16451)
-- Name: teachers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teachers (
    id integer NOT NULL,
    name text NOT NULL,
    user_id integer
);


ALTER TABLE public.teachers OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16450)
-- Name: teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teachers_id_seq OWNER TO postgres;

--
-- TOC entry 5140 (class 0 OID 0)
-- Dependencies: 227
-- Name: teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teachers_id_seq OWNED BY public.teachers.id;


--
-- TOC entry 233 (class 1259 OID 16542)
-- Name: teachers_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teachers_preferences (
    id integer NOT NULL,
    teacher_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    lesson_number smallint NOT NULL,
    preference_weight integer DEFAULT 0,
    CONSTRAINT teachers_preferences_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT teachers_preferences_lesson_number_check CHECK (((lesson_number >= 1) AND (lesson_number <= 7)))
);


ALTER TABLE public.teachers_preferences OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16541)
-- Name: teachers_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teachers_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teachers_preferences_id_seq OWNER TO postgres;

--
-- TOC entry 5141 (class 0 OID 0)
-- Dependencies: 232
-- Name: teachers_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teachers_preferences_id_seq OWNED BY public.teachers_preferences.id;


--
-- TOC entry 220 (class 1259 OID 16398)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    role public.order_roles NOT NULL,
    name text,
    login text NOT NULL,
    email text,
    password_hash text NOT NULL,
    group_id integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16397)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5142 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4922 (class 2604 OID 16434)
-- Name: classrooms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms ALTER COLUMN id SET DEFAULT nextval('public.classrooms_id_seq'::regclass);


--
-- TOC entry 4921 (class 2604 OID 16414)
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- TOC entry 4925 (class 2604 OID 16495)
-- Name: lessons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons ALTER COLUMN id SET DEFAULT nextval('public.schelude_id_seq'::regclass);


--
-- TOC entry 4931 (class 2604 OID 16624)
-- Name: penalties id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penalties ALTER COLUMN id SET DEFAULT nextval('public.penaltyes_id_seq'::regclass);


--
-- TOC entry 4923 (class 2604 OID 16443)
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- TOC entry 4924 (class 2604 OID 16454)
-- Name: teachers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers ALTER COLUMN id SET DEFAULT nextval('public.teachers_id_seq'::regclass);


--
-- TOC entry 4926 (class 2604 OID 16545)
-- Name: teachers_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers_preferences ALTER COLUMN id SET DEFAULT nextval('public.teachers_preferences_id_seq'::regclass);


--
-- TOC entry 4920 (class 2604 OID 16401)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4943 (class 2606 OID 16438)
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (id);


--
-- TOC entry 4945 (class 2606 OID 16521)
-- Name: classrooms classrooms_room_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_room_number_key UNIQUE (room_number);


--
-- TOC entry 4941 (class 2606 OID 16419)
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- TOC entry 4961 (class 2606 OID 16586)
-- Name: lesson_version_items lesson_version_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_version_items
    ADD CONSTRAINT lesson_version_items_pkey PRIMARY KEY (lesson_id, version_id);


--
-- TOC entry 4967 (class 2606 OID 16637)
-- Name: lessons_versions_penalties lessons_versions_penalties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons_versions_penalties
    ADD CONSTRAINT lessons_versions_penalties_pkey PRIMARY KEY (lessons_versions_id, penalty_id);


--
-- TOC entry 4959 (class 2606 OID 16579)
-- Name: lessons_versions lessons_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons_versions
    ADD CONSTRAINT lessons_versions_pkey PRIMARY KEY (id);


--
-- TOC entry 4965 (class 2606 OID 16629)
-- Name: penalties penaltyes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penalties
    ADD CONSTRAINT penaltyes_pkey PRIMARY KEY (id);


--
-- TOC entry 4963 (class 2606 OID 16605)
-- Name: published_scedule_version published_scedule_version_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.published_scedule_version
    ADD CONSTRAINT published_scedule_version_pkey PRIMARY KEY (id);


--
-- TOC entry 4953 (class 2606 OID 16504)
-- Name: lessons schelude_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT schelude_pkey PRIMARY KEY (id);


--
-- TOC entry 4947 (class 2606 OID 16449)
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- TOC entry 4951 (class 2606 OID 16531)
-- Name: teacher_subjects teacher_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_pkey PRIMARY KEY (teacher_id, subject_id);


--
-- TOC entry 4949 (class 2606 OID 16460)
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- TOC entry 4955 (class 2606 OID 16554)
-- Name: teachers_preferences teachers_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers_preferences
    ADD CONSTRAINT teachers_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 4957 (class 2606 OID 16556)
-- Name: teachers_preferences unique_preference; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers_preferences
    ADD CONSTRAINT unique_preference UNIQUE (teacher_id, day_of_week, lesson_number);


--
-- TOC entry 4937 (class 2606 OID 16649)
-- Name: users unq_login; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unq_login UNIQUE (login);


--
-- TOC entry 4939 (class 2606 OID 16409)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4972 (class 2606 OID 16515)
-- Name: lessons fk_classroom; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT fk_classroom FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) NOT VALID;


--
-- TOC entry 4973 (class 2606 OID 16505)
-- Name: lessons fk_group; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES public.groups(id) NOT VALID;


--
-- TOC entry 4968 (class 2606 OID 16425)
-- Name: users fk_group; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES public.groups(id) NOT VALID;


--
-- TOC entry 4977 (class 2606 OID 16587)
-- Name: lesson_version_items fk_lesson; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_version_items
    ADD CONSTRAINT fk_lesson FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4980 (class 2606 OID 16643)
-- Name: lessons_versions_penalties fk_penalty; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons_versions_penalties
    ADD CONSTRAINT fk_penalty FOREIGN KEY (penalty_id) REFERENCES public.penalties(id);


--
-- TOC entry 4974 (class 2606 OID 16522)
-- Name: lessons fk_subject; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES public.subjects(id) NOT VALID;


--
-- TOC entry 4970 (class 2606 OID 16479)
-- Name: teacher_subjects fk_subject; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 4975 (class 2606 OID 16510)
-- Name: lessons fk_teacher; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) NOT VALID;


--
-- TOC entry 4971 (class 2606 OID 16474)
-- Name: teacher_subjects fk_teacher; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 4976 (class 2606 OID 16557)
-- Name: teachers_preferences fk_teacher; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers_preferences
    ADD CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 4969 (class 2606 OID 16461)
-- Name: teachers fk_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT fk_users FOREIGN KEY (user_id) REFERENCES public.users(id) NOT VALID;


--
-- TOC entry 4978 (class 2606 OID 16592)
-- Name: lesson_version_items fk_version; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_version_items
    ADD CONSTRAINT fk_version FOREIGN KEY (version_id) REFERENCES public.lessons_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4981 (class 2606 OID 16638)
-- Name: lessons_versions_penalties fk_version; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons_versions_penalties
    ADD CONSTRAINT fk_version FOREIGN KEY (lessons_versions_id) REFERENCES public.lessons_versions(id);


--
-- TOC entry 4979 (class 2606 OID 16606)
-- Name: published_scedule_version fk_version; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.published_scedule_version
    ADD CONSTRAINT fk_version FOREIGN KEY (lessons_versions_id) REFERENCES public.lessons_versions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


-- Completed on 2026-11-14 13:24:46

--
-- PostgreSQL database dump complete
--

\unrestrict fz0HOLH6AxbKn3jDJV1zrT9P4ggkQbKCxAAD1OJByDXg9Ub312OiMXAY4MJYVjA

