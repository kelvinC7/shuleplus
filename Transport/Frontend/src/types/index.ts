export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}
