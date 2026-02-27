import { convexAuthNextjsMiddleware, createRouteMatcher, nextjsMiddlewareRedirect } from "@convex-dev/auth/nextjs/server";
import {isByPassRoutes, isPublicRoutes, isProtectedRoutes} from './lib/permissions'
import { convexAuth } from "@convex-dev/auth/server";
 
const PublicMatcher = createRouteMatcher(isPublicRoutes)
const BypassMatcher = createRouteMatcher(isByPassRoutes)
const ProtectedMatcher = createRouteMatcher(isPublicRoutes) 

export default convexAuthNextjsMiddleware(async (request, {convexAuth}) => {
    if (BypassMatcher(request)) return
    const authed = await convexAuth.isAuthenticated()
    if (PublicMatcher(request) && authed){
        return nextjsMiddlewareRedirect(request, '/dashboard')
    }
    if(ProtectedMatcher(request) && !authed){
        return nextjsMiddlewareRedirect(request, '/auth/sign-in')
    }
    return
},
{
    cookieConfig: {maxAge: 60 * 60 * 24 *30},
}
);
 
export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};