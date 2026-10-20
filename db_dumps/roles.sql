--
-- PostgreSQL database cluster dump
--

\restrict 7aUbCu1kyKdIkklX8DyAEwqRmQmOtLu4PdXqZQip4ePzYEjTYpA5xA8lHfquFYZ

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:xrUJbTMp9IEgkgPorMuCqg==$sa19CBjyNxFiEydfvN46oCDWeyhToqx+cRsP6XF5xzg=:ypBzKUm+Y9vmY/X6VnXizpXtNN3apvGEbf+BmO211Fg=';




\unrestrict 7aUbCu1kyKdIkklX8DyAEwqRmQmOtLu4PdXqZQip4ePzYEjTYpA5xA8lHfquFYZ

--
-- PostgreSQL database cluster dump complete
--

