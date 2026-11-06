// Returns the public details of one business for its demo page.
import { findBusiness, publicProfile } from "../businesses.mjs";

export default async (req) => {
  const key = new URL(req.url).searchParams.get("b");
  const b = findBusiness(key);
  return new Response(JSON.stringify(b ? publicProfile(b) : { error: "Unknown business." }), {
    status: b ? 200 : 404,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=60" },
  });
};

export const config = { path: "/api/profile" };
