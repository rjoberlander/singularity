--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

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

-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin

--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	a2b65f9e-b78f-4e03-ab69-2dc785f9aa16	authenticated	authenticated	unconfirmed@test.com	$2a$10$KXzZXJXg8aMMxB9BfWltiOsZPE7.7DcMSM8htNi8x.ebKXpDt4e0q	2025-12-29 21:50:51.413456+00	\N		\N		\N			\N	2025-12-31 03:11:07.945949+00	{"provider": "email", "providers": ["email"]}	{"name": "Unconfirmed User", "email_verified": true}	\N	2025-12-29 21:33:09.221965+00	2025-12-31 03:11:07.947945+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	9f040843-2abe-4bfd-a68a-ea05e0852fa3	authenticated	authenticated	test4487t0o4@gmail.com	$2a$10$FqNfvku43HzhTOA7NVBOP.AbuwzndsAQFUaWlemszVISEriiGKbkC	2025-12-29 21:07:54.611423+00	\N		2025-12-29 21:07:53.963939+00		\N			\N	2025-12-29 21:07:58.008692+00	{"provider": "email", "providers": ["email"]}	{"sub": "9f040843-2abe-4bfd-a68a-ea05e0852fa3", "name": "Test User 4487t0o4", "email": "test4487t0o4@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-12-29 21:07:53.958759+00	2025-12-29 21:07:58.011289+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	667b127f-aa1e-456a-840d-288cf34e78ff	authenticated	authenticated	test@singularity.app	$2a$10$TBOtyzmcPdciaNQX.J9NZe2SF894GtxUL956L9fqNEtiAgy/l2Oce	2025-12-28 22:00:56.226837+00	\N		\N		\N			\N	2025-12-31 03:11:13.21416+00	{"provider": "email", "providers": ["email"]}	{"name": "Test User", "email_verified": true}	\N	2025-12-28 22:00:56.182593+00	2025-12-31 03:11:13.216123+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	b201a860-05a3-4ddc-bb89-4c4271177271	authenticated	authenticated	rjoberlander@gmail.com	$2a$10$fsB/j3eyBQdXidUaTJe2yuVMwAJzrbzg6T76CPQKzOKHj2hUbBpBq	2025-12-29 21:26:38.250142+00	\N		\N		\N			\N	2026-03-04 23:37:37.324308+00	{"provider": "email", "providers": ["email"]}	{"name": "Rich Oh", "email_verified": true}	\N	2025-12-29 17:53:00.481546+00	2026-03-05 16:49:18.485655+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--

-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin

--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
667b127f-aa1e-456a-840d-288cf34e78ff	667b127f-aa1e-456a-840d-288cf34e78ff	{"sub": "667b127f-aa1e-456a-840d-288cf34e78ff", "email": "test@singularity.app", "email_verified": false, "phone_verified": false}	email	2025-12-28 22:00:56.211953+00	2025-12-28 22:00:56.213095+00	2025-12-28 22:00:56.213095+00	97704e44-a158-4be8-a8d5-7f281854eee5
b201a860-05a3-4ddc-bb89-4c4271177271	b201a860-05a3-4ddc-bb89-4c4271177271	{"sub": "b201a860-05a3-4ddc-bb89-4c4271177271", "email": "rjoberlander@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-12-29 17:53:00.520562+00	2025-12-29 17:53:00.521185+00	2025-12-29 17:53:00.521185+00	653aedf7-0dc0-45ac-b8d8-4d4d19380c1b
9f040843-2abe-4bfd-a68a-ea05e0852fa3	9f040843-2abe-4bfd-a68a-ea05e0852fa3	{"sub": "9f040843-2abe-4bfd-a68a-ea05e0852fa3", "name": "Test User 4487t0o4", "email": "test4487t0o4@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-12-29 21:07:53.960953+00	2025-12-29 21:07:53.960998+00	2025-12-29 21:07:53.960998+00	5131b0ef-586a-40f5-9b46-9c29746f7389
a2b65f9e-b78f-4e03-ab69-2dc785f9aa16	a2b65f9e-b78f-4e03-ab69-2dc785f9aa16	{"sub": "a2b65f9e-b78f-4e03-ab69-2dc785f9aa16", "email": "unconfirmed@test.com", "email_verified": false, "phone_verified": false}	email	2025-12-29 21:33:09.232431+00	2025-12-29 21:33:09.232503+00	2025-12-29 21:33:09.232503+00	d67c4be2-cdf0-404c-bf43-823297de12a4
\.


--
