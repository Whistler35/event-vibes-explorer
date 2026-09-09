GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_dm(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm(uuid, uuid) TO authenticated;