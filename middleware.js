// middleware.js
// Correct the import path if the file is named differently or located elsewhere
import { updateSession } from './src/utils/supabase/middleware.js'
// If the file is named 'Middleware.js', use:
// import { updateSession } from './utils/supabase/Middleware.js'
// If the file is in a different folder, update the path accordingly.
export async function middleware(request) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}