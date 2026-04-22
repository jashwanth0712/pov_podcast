import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isProtectedPage = createRouteMatcher([
  "/session(.*)",
  "/scenario/create(.*)",
]);

export default convexAuthNextjsMiddleware((request, { convexAuth }) => {
  if (isProtectedPage(request) && !convexAuth.isAuthenticated()) {
    const redirect = request.nextUrl.pathname + request.nextUrl.search;
    return nextjsMiddlewareRedirect(
      request,
      `/auth?redirect=${encodeURIComponent(redirect)}`
    );
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
