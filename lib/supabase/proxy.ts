import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Supabase checks temporarily disabled to focus on the height model
  // (Previously tried to createServerClient which caused crashes without env variables)
  
  return supabaseResponse
}
