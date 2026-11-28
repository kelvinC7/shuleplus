--
-- PostgreSQL database cluster dump
--

\restrict TLhjSKGFZDJG1XFlNktiyl5eMEII82MKMrUJ4D5mdlL5FpJ11oCU7XSxRFm2xXb

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:xrUJbTMp9IEgkgPorMuCqg==$sa19CBjyNxFiEydfvN46oCDWeyhToqx+cRsP6XF5xzg=:ypBzKUm+Y9vmY/X6VnXizpXtNN3apvGEbf+BmO211Fg=';






\unrestrict TLhjSKGFZDJG1XFlNktiyl5eMEII82MKMrUJ4D5mdlL5FpJ11oCU7XSxRFm2xXb

--
-- PostgreSQL database cluster dump complete
--

