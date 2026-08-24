import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Primera barrera: sin sesión no se llega a las rutas privadas, y con una
 * contraseña temporal no se llega a ninguna parte que no sea cambiarla.
 *
 * La autorización real (qué puede ver cada rol) se verifica siempre en el
 * servidor dentro de cada página y Server Action.
 */
export default withAuth(function middleware(request) {
  const token = request.nextauth?.token;
  const { pathname } = request.nextUrl;

  if (token?.mustChangePassword && !pathname.startsWith("/mi-cuenta")) {
    const url = request.nextUrl.clone();
    url.pathname = "/mi-cuenta";
    url.search = "?cambio=obligatorio";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/panel/:path*",
    "/trabajos/:path*",
    "/asesorias/:path*",
    "/alertas/:path*",
    "/reportes/:path*",
    "/configuracion/:path*",
    "/auditoria/:path*",
    "/usuarios/:path*",
    "/mi-cuenta/:path*",
    // También la API de reportes: con una contraseña temporal no se descarga nada.
    "/api/reportes/:path*",
  ],
};
