export { default } from "next-auth/middleware";

/**
 * Primera barrera: sin sesión no se llega a las rutas privadas.
 * La autorización real (qué puede ver cada rol) se verifica siempre en el
 * servidor dentro de cada página y Server Action.
 */
export const config = {
  matcher: [
    "/panel/:path*",
    "/trabajos/:path*",
    "/asesorias/:path*",
    "/alertas/:path*",
    "/reportes/:path*",
    "/configuracion/:path*",
    "/auditoria/:path*",
  ],
};
