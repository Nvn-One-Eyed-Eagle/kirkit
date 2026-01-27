export interface PlayerRow {
  id: string;
  runs: number;
  balls: number;
  fours: string;
  sixes: string;
  highscore: number;
  image: string | null;
  matches: number;
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // GET /players → return local D1 data
	if (url.pathname === "/players") {
	const result = await env.DB
		.prepare("SELECT * FROM players")
		.all();

	const players = (result.results as PlayerRow[]).map(p => ({
		...p,
		fours: JSON.parse(p.fours),
		sixes: JSON.parse(p.sixes)
	}));

	return new Response(JSON.stringify(players), {
		headers: { "Content-Type": "application/json" }
	});
	}


    return new Response("Not Found", { status: 404 });
  }
};
