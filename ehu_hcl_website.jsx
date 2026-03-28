import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Upload, Shuffle, Star, Goal, MapPin, Shield, Medal } from 'lucide-react';

const hostCities = [
  'London', 'Stockholm', 'Toronto', 'New York City', 'Chicago', 'Prague', 'Munich', 'Milan', 'Helsinki', 'Zurich', 'Montreal', 'Boston'
];

const teamNames = [
  'Long Island Cannons', 'Chicago Ramparts', 'Toronto Blazers', 'NYC Patriots', 'Boston Braves', 'LA Quakers',
  'Dallas Bucks', 'Detroit Vipers', 'Edmonton Bruisers', 'Calgary Cavaliers', 'Winnipeg Seals', 'Ottawa Lancers',
  'Jokerit', 'Tappara', 'Färjestad BK', 'CSKA Moscow', 'HC Davos', 'HC Milano',
  'Manchester Saints', 'SC Bern', 'Frölunda HC', 'ZSC Lions', 'Eisbären Berlin', 'Sparta Praha',
  'Red Bull Salzburg', 'Kärpät', 'Luleå HF', 'Linköping HC', 'Belfast Giants', 'Cardiff Dragons',
  'Braga HC', 'Sofia HC', 'Valerenga HC', 'Debrecen Bihar', 'Nitra Dynamite', 'HC Pardubice'
];

const initialTeams = teamNames.map((name, i) => ({
  id: i + 1,
  name,
  rating: 72 + ((i * 7) % 24),
  logo: '',
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  gf: 0,
  ga: 0,
  pts: 0,
  scorers: [],
}));

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const makePlayerName = (teamName, n) => {
  const first = ['Alex', 'Niko', 'Luca', 'Mason', 'Dylan', 'Leo', 'Ivan', 'Erik', 'Victor', 'Mikko', 'Ryan', 'Anton'];
  const last = ['Stone', 'Petrov', 'Karlsson', 'Moretti', 'Kovacs', 'Silva', 'Santos', 'Berg', 'Rossi', 'Walsh', 'Novak', 'Salo'];
  return `${first[(n * 3) % first.length]} ${last[(n * 5) % last.length]} (${teamName.split(' ')[0]})`;
};

function simulateMatch(teamA, teamB, knockout = false) {
  const aBase = Math.max(0, Math.round(teamA.rating / 18) + rand(0, 3));
  const bBase = Math.max(0, Math.round(teamB.rating / 18) + rand(0, 3));
  let aGoals = Math.max(0, aBase + rand(-2, 2));
  let bGoals = Math.max(0, bBase + rand(-2, 2));
  if (!knockout && aGoals === bGoals && Math.random() > 0.5) {
    return { aGoals, bGoals, wentToOT: false, shootout: false, winner: null };
  }
  if (knockout && aGoals === bGoals) {
    const otWinner = Math.random() > 0.5 ? 'A' : 'B';
    return {
      aGoals,
      bGoals,
      wentToOT: true,
      shootout: Math.random() > 0.5,
      winner: otWinner,
    };
  }
  return { aGoals, bGoals, wentToOT: false, shootout: false, winner: aGoals > bGoals ? 'A' : 'B' };
}

function BracketMatch({ match, align = 'left' }) {
  return (
    <div className={`w-full rounded-2xl border border-white/15 bg-white/10 p-3 shadow-lg backdrop-blur ${align === 'right' ? 'text-right' : ''}`}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">{match.round}</div>
      <div className="mt-2 space-y-2">
        {[match.team1, match.team2].map((team, idx) => (
          <div key={idx} className={`flex items-center gap-2 rounded-xl px-2 py-2 ${align === 'right' ? 'justify-end' : ''} ${team?.winner ? 'bg-cyan-400/20' : 'bg-slate-900/40'}`}>
            {align !== 'right' && <Logo logo={team?.logo} name={team?.name || 'TBD'} />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{team?.name || 'TBD'}</div>
              <div className="text-xs text-slate-300">{team?.score ?? '-'} </div>
            </div>
            {align === 'right' && <Logo logo={team?.logo} name={team?.name || 'TBD'} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Logo({ logo, name }) {
  if (logo) return <img src={logo} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20" />;
  return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-700 text-[10px] font-bold text-white">{name.slice(0,2).toUpperCase()}</div>;
}

export default function EHUHCLWebsite() {
  const [season, setSeason] = useState(2068);
  const [finalCity, setFinalCity] = useState('London');
  const [teams, setTeams] = useState(initialTeams);
  const [leagueResults, setLeagueResults] = useState([]);
  const [bracket, setBracket] = useState({ playoff: [], r16: [], qf: [], sf: [], final: null });
  const [stats, setStats] = useState({ topScorers: [], playerOfTournament: null, upsets: [] });
  const [history, setHistory] = useState([]);

  const standings = useMemo(() => [...teams].sort((a, b) => (
    b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || b.rating - a.rating
  )), [teams]);

  const updateTeamField = (id, field, value) => {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const onUpload = (id, file) => {
    const reader = new FileReader();
    reader.onload = e => updateTeamField(id, 'logo', e.target?.result || '');
    if (file) reader.readAsDataURL(file);
  };

  const resetStats = () => setTeams(prev => prev.map(t => ({ ...t, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, pts: 0, scorers: [] })));

  const recordGoals = (team, goals) => {
    const scorers = [];
    for (let i = 0; i < goals; i++) {
      scorers.push(makePlayerName(team.name, rand(1, 50)));
    }
    return scorers;
  };

  const simulateLeague = () => {
    let tempTeams = teams.map(t => ({ ...t, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, pts: 0, scorers: [] }));
    const results = [];
    const pairSet = new Set();

    const getTeam = (id) => tempTeams.find(t => t.id === id);
    const sortedForSeeds = [...tempTeams].sort((a, b) => b.rating - a.rating);
    const pots = [
      sortedForSeeds.slice(0, 9),
      sortedForSeeds.slice(9, 18),
      sortedForSeeds.slice(18, 27),
      sortedForSeeds.slice(27, 36),
    ];

    tempTeams.forEach((team) => {
      const opponents = [];
      pots.forEach((pot, potIndex) => {
        const candidates = shuffle(pot.filter(p => p.id !== team.id && !opponents.some(o => o.id === p.id)));
        for (const cand of candidates) {
          const key = [team.id, cand.id].sort((a, b) => a - b).join('-');
          if (!pairSet.has(key)) {
            opponents.push(cand);
            pairSet.add(key);
            break;
          }
        }
        if (potIndex === 3) {
          const filler = shuffle(tempTeams.filter(p => p.id !== team.id && !opponents.some(o => o.id === p.id))).slice(0, Math.max(0, 8 - opponents.length));
          filler.forEach(c => {
            const key = [team.id, c.id].sort((a, b) => a - b).join('-');
            if (!pairSet.has(key) && opponents.length < 8) {
              opponents.push(c);
              pairSet.add(key);
            }
          });
        }
      });

      opponents.slice(0, 8).forEach((opp, idx) => {
        const home = idx < 4 ? team : opp;
        const away = idx < 4 ? opp : team;
        const key = [home.id, away.id].sort((a, b) => a - b).join('-');
        if (results.some(r => r.key === key)) return;
        const sim = simulateMatch(home, away, false);
        const homeGoals = sim.aGoals;
        const awayGoals = sim.bGoals;
        const h = getTeam(home.id);
        const a = getTeam(away.id);
        h.played += 1; a.played += 1;
        h.gf += homeGoals; h.ga += awayGoals;
        a.gf += awayGoals; a.ga += homeGoals;
        h.scorers.push(...recordGoals(h, homeGoals));
        a.scorers.push(...recordGoals(a, awayGoals));
        if (homeGoals > awayGoals) {
          h.wins += 1; a.losses += 1; h.pts += 3;
        } else if (awayGoals > homeGoals) {
          a.wins += 1; h.losses += 1; a.pts += 3;
        } else {
          h.draws += 1; a.draws += 1; h.pts += 1; a.pts += 1;
        }
        results.push({ key, home: home.name, away: away.name, homeGoals, awayGoals });
      });
    });

    tempTeams = [...tempTeams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || b.rating - a.rating);
    setTeams(tempTeams);
    setLeagueResults(results);

    const scorersMap = {};
    tempTeams.forEach(team => team.scorers.forEach(name => { scorersMap[name] = (scorersMap[name] || 0) + 1; }));
    const topScorers = Object.entries(scorersMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, goals]) => ({ name, goals }));

    const upsets = results
      .filter(r => {
        const home = tempTeams.find(t => t.name === r.home);
        const away = tempTeams.find(t => t.name === r.away);
        const diff = Math.abs(home.rating - away.rating);
        const lowerWon = (home.rating < away.rating && r.homeGoals > r.awayGoals) || (away.rating < home.rating && r.awayGoals > r.homeGoals);
        return diff >= 10 && lowerWon;
      })
      .slice(0, 8)
      .map(r => `${r.home} ${r.homeGoals}-${r.awayGoals} ${r.away}`);

    setStats({
      topScorers,
      playerOfTournament: topScorers[0]?.name || 'TBD',
      upsets,
    });
  };

  const playTwoLeggedTie = (team1, team2, round) => {
    const leg1 = simulateMatch(team1, team2, true);
    const leg2 = simulateMatch(team2, team1, true);
    const agg1 = leg1.aGoals + leg2.bGoals;
    const agg2 = leg1.bGoals + leg2.aGoals;
    let winner = team1;
    let loser = team2;
    if (agg2 > agg1) { winner = team2; loser = team1; }
    if (agg1 === agg2) {
      winner = Math.random() > 0.5 ? team1 : team2;
      loser = winner.id === team1.id ? team2 : team1;
    }
    return {
      round,
      team1: { ...team1, score: `${leg1.aGoals}-${leg1.bGoals} / ${leg2.bGoals}-${leg2.aGoals}`, winner: winner.id === team1.id },
      team2: { ...team2, score: `${leg1.bGoals}-${leg1.aGoals} / ${leg2.aGoals}-${leg2.bGoals}`, winner: winner.id === team2.id },
      winner,
      loser,
    };
  };

  const simulateKnockout = () => {
    const ranked = [...teams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || b.rating - a.rating);
    const top8 = ranked.slice(0, 8);
    const playoffTeams = ranked.slice(8, 24);

    const playoff = [];
    const playoffWinners = [];
    for (let i = 0; i < 8; i++) {
      const high = playoffTeams[i];
      const low = playoffTeams[15 - i];
      const tie = playTwoLeggedTie(high, low, 'Playoff');
      playoff.push(tie);
      playoffWinners.push(tie.winner);
    }

    const r16Teams = [...top8, ...playoffWinners];
    const seededR16 = [];
    for (let i = 0; i < 8; i++) seededR16.push(playTwoLeggedTie(r16Teams[i], r16Teams[15 - i], 'R16'));

    const qf = [];
    for (let i = 0; i < 4; i++) qf.push(playTwoLeggedTie(seededR16[i * 2].winner, seededR16[i * 2 + 1].winner, 'QF'));

    const sf = [];
    for (let i = 0; i < 2; i++) sf.push(playTwoLeggedTie(qf[i * 2].winner, qf[i * 2 + 1].winner, 'SF'));

    const fA = sf[0].winner;
    const fB = sf[1].winner;
    const finalSim = simulateMatch(fA, fB, true);
    let champion = fA;
    let runnerUp = fB;
    if (finalSim.aGoals < finalSim.bGoals) { champion = fB; runnerUp = fA; }
    if (finalSim.aGoals === finalSim.bGoals) {
      champion = Math.random() > 0.5 ? fA : fB;
      runnerUp = champion.id === fA.id ? fB : fA;
    }
    const final = {
      round: 'Final',
      team1: { ...fA, score: finalSim.aGoals, winner: champion.id === fA.id },
      team2: { ...fB, score: finalSim.bGoals, winner: champion.id === fB.id },
      champion,
      runnerUp,
      city: finalCity,
    };

    setBracket({ playoff, r16: seededR16, qf, sf, final });
    setHistory(prev => [{ season, champion: champion.name, runnerUp: runnerUp.name, city: finalCity, score: `${finalSim.aGoals}-${finalSim.bGoals}` }, ...prev]);
    setStats(prev => ({ ...prev, playerOfTournament: prev.topScorers[0]?.name || makePlayerName(champion.name, 7) }));
  };

  const randomizeRatings = () => {
    setTeams(prev => prev.map(t => ({ ...t, rating: rand(70, 96) })));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1434a4,_#081235_55%,_#040816)] p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-cyan-200">Road to Glory</div>
                  <CardTitle className="mt-2 text-3xl font-black tracking-tight">EHU Hockey Champions League</CardTitle>
                  <div className="mt-2 text-slate-300">Custom competition website and simulator starting in season {season}.</div>
                </div>
                <div className="flex items-center gap-3">
                  <Input className="w-28 border-white/20 bg-slate-950/40" type="number" value={season} onChange={(e) => setSeason(Number(e.target.value) || 2068)} />
                  <Select value={finalCity} onValueChange={setFinalCity}>
                    <SelectTrigger className="w-44 border-white/20 bg-slate-950/40"><SelectValue placeholder="Final city" /></SelectTrigger>
                    <SelectContent>
                      {hostCities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button onClick={simulateLeague} className="rounded-2xl bg-cyan-500 text-slate-950 hover:bg-cyan-400"><Shuffle className="mr-2 h-4 w-4" />Simulate League</Button>
                <Button onClick={simulateKnockout} variant="secondary" className="rounded-2xl bg-white/15 hover:bg-white/20"> <Trophy className="mr-2 h-4 w-4" />Simulate Knockouts</Button>
                <Button onClick={randomizeRatings} variant="secondary" className="rounded-2xl bg-white/15 hover:bg-white/20"><Star className="mr-2 h-4 w-4" />Randomize Ratings</Button>
                <Button onClick={resetStats} variant="secondary" className="rounded-2xl bg-white/15 hover:bg-white/20">Reset Table</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 to-white/5 shadow-2xl backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl"><Medal className="h-5 w-5 text-yellow-300" /> Final Host</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 text-center">
                <MapPin className="mx-auto mb-2 h-8 w-8 text-cyan-300" />
                <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Season {season}</div>
                <div className="mt-2 text-3xl font-black text-white">{finalCity}</div>
                <div className="mt-2 text-sm text-slate-300">Neutral-site final city</div>
              </div>
              <div className="rounded-3xl border border-yellow-400/20 bg-gradient-to-b from-yellow-300/10 to-transparent p-5 text-center">
                <Trophy className="mx-auto h-20 w-20 text-yellow-300" />
                <div className="mt-3 text-lg font-bold">HCL Trophy</div>
                <div className="text-sm text-slate-300">Display centerpiece for the bracket and championship page.</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="clubs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 rounded-2xl bg-white/10">
            <TabsTrigger value="clubs">Clubs</TabsTrigger>
            <TabsTrigger value="league">League Table</TabsTrigger>
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="history">Finals Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="clubs">
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-cyan-300" /> Club Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {teams.map(team => (
                    <div key={team.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 shadow-lg">
                      <div className="mb-3 flex items-center gap-3">
                        <Logo logo={team.logo} name={team.name} />
                        <Input value={team.name} onChange={(e) => updateTeamField(team.id, 'name', e.target.value)} className="border-white/15 bg-white/5" />
                      </div>
                      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <Input type="number" min={50} max={99} value={team.rating} onChange={(e) => updateTeamField(team.id, 'rating', Number(e.target.value) || 75)} className="border-white/15 bg-white/5" />
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-cyan-300/40 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10">
                          <Upload className="h-4 w-4" /> Logo
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(team.id, e.target.files?.[0])} />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="league">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader><CardTitle>League Table</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[650px] pr-4">
                    <div className="space-y-2">
                      {standings.map((team, index) => (
                        <div key={team.id} className={`grid grid-cols-[42px_1fr_repeat(7,56px)] items-center gap-2 rounded-2xl p-3 ${index < 8 ? 'bg-cyan-400/15' : index < 24 ? 'bg-white/8' : 'bg-rose-400/12'}`}>
                          <div className="font-black text-cyan-100">{index + 1}</div>
                          <div className="flex items-center gap-3 min-w-0">
                            <Logo logo={team.logo} name={team.name} />
                            <div className="truncate font-semibold">{team.name}</div>
                          </div>
                          <div>{team.played}</div><div>{team.wins}</div><div>{team.draws}</div><div>{team.losses}</div><div>{team.gf}</div><div>{team.ga}</div><div className="font-bold">{team.pts}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader><CardTitle>League Match Log</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[650px] pr-4">
                    <div className="space-y-2">
                      {leagueResults.length === 0 && <div className="text-slate-300">Simulate the league phase to generate fixtures and results.</div>}
                      {leagueResults.map((r, i) => (
                        <div key={i} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-sm">
                          <div className="font-semibold text-white">{r.home} <span className="text-cyan-300">{r.homeGoals}-{r.awayGoals}</span> {r.away}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bracket">
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl">Knockout Bracket</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 xl:grid-cols-[1fr_220px_1fr]">
                  <div className="space-y-4">
                    <div className="text-sm uppercase tracking-[0.25em] text-cyan-200">Left Side</div>
                    {bracket.r16.slice(0,4).map((m, i) => <BracketMatch key={i} match={m} align="left" />)}
                    {bracket.qf.slice(0,2).map((m, i) => <BracketMatch key={`qfl${i}`} match={m} align="left" />)}
                    {bracket.sf.slice(0,1).map((m, i) => <BracketMatch key={`sfl${i}`} match={m} align="left" />)}
                  </div>

                  <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-yellow-300/20 bg-gradient-to-b from-yellow-300/10 to-transparent p-6 text-center">
                    <Trophy className="h-24 w-24 text-yellow-300" />
                    <div>
                      <div className="text-xs uppercase tracking-[0.3em] text-yellow-200">Road To {finalCity}</div>
                      <div className="mt-2 text-2xl font-black">HCL Final</div>
                    </div>
                    {bracket.final ? (
                      <div className="w-full rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-cyan-200">Final • {bracket.final.city}</div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-2">
                            <div className="flex items-center gap-2"><Logo logo={bracket.final.team1.logo} name={bracket.final.team1.name} /><span className="text-sm font-semibold">{bracket.final.team1.name}</span></div>
                            <span className="font-black">{bracket.final.team1.score}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-2">
                            <div className="flex items-center gap-2"><Logo logo={bracket.final.team2.logo} name={bracket.final.team2.name} /><span className="text-sm font-semibold">{bracket.final.team2.name}</span></div>
                            <span className="font-black">{bracket.final.team2.score}</span>
                          </div>
                        </div>
                        <div className="mt-4 rounded-xl bg-yellow-300/15 p-3 text-sm font-bold text-yellow-100">Champion: {bracket.final.champion.name}</div>
                      </div>
                    ) : <div className="text-sm text-slate-300">Simulate knockouts after the league phase.</div>}
                  </div>

                  <div className="space-y-4">
                    <div className="text-right text-sm uppercase tracking-[0.25em] text-cyan-200">Right Side</div>
                    {bracket.r16.slice(4,8).map((m, i) => <BracketMatch key={`r${i}`} match={m} align="right" />)}
                    {bracket.qf.slice(2,4).map((m, i) => <BracketMatch key={`qfr${i}`} match={m} align="right" />)}
                    {bracket.sf.slice(1,2).map((m, i) => <BracketMatch key={`sfr${i}`} match={m} align="right" />)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader><CardTitle className="flex items-center gap-2"><Goal className="h-5 w-5 text-cyan-300" /> Top Scorers</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {stats.topScorers.length === 0 && <div className="text-slate-300">Simulate the league first.</div>}
                  {stats.topScorers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-slate-950/40 p-3">
                      <span className="text-sm font-medium">{p.name}</span>
                      <Badge variant="secondary" className="bg-cyan-400/20 text-cyan-100">{p.goals} G</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-300" /> Player of the Tournament</CardTitle></CardHeader>
                <CardContent>
                  <div className="rounded-3xl border border-yellow-300/20 bg-gradient-to-br from-yellow-300/10 to-transparent p-6 text-center">
                    <Star className="mx-auto h-12 w-12 text-yellow-300" />
                    <div className="mt-4 text-2xl font-black">{stats.playerOfTournament || 'TBD'}</div>
                    <div className="mt-2 text-sm text-slate-300">Awarded to the standout performer of the season.</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader><CardTitle>Upsets</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {stats.upsets.length === 0 && <div className="text-slate-300">Major surprise wins will appear here.</div>}
                  {stats.upsets.map((u, i) => (
                    <div key={i} className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-50">{u}</div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader><CardTitle>Finals Tracker</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-[100px_1fr_1fr_100px_140px] gap-2 rounded-2xl bg-white/10 p-3 text-sm font-bold text-cyan-100">
                  <div>Season</div><div>Champion</div><div>Runner-Up</div><div>Score</div><div>Host City</div>
                </div>
                <div className="mt-3 space-y-2">
                  {history.length === 0 && <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-slate-300">No final has been simulated yet.</div>}
                  {history.map((row, i) => (
                    <div key={i} className="grid grid-cols-[100px_1fr_1fr_100px_140px] gap-2 rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-sm">
                      <div>{row.season}</div><div className="font-semibold text-yellow-200">{row.champion}</div><div>{row.runnerUp}</div><div>{row.score}</div><div>{row.city}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
