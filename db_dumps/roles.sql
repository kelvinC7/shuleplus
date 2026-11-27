--
-- PostgreSQL database cluster dump
--

\restrict TX97GbnhkiCXhTa6QkRIOKrTGbhw08Z9wlc1mKEXS2sxEXaIGBdybLeyzbgUzXM

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:xrUJbTMp9IEgkgPorMuCqg==$sa19CBjyNxFiEydfvN46oCDWeyhToqx+cRsP6XF5xzg=:ypBzKUm+Y9vmY/X6VnXizpXtNN3apvGEbf+BmO211Fg=';






\unrestrict TX97GbnhkiCXhTa6QkRIOKrTGbhw08Z9wlc1mKEXS2sxEXaIGBdybLeyzbgUzXM

--
-- PostgreSQL database cluster dump complete
--

