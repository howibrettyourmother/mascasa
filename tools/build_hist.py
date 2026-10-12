#!/usr/bin/env python3
"""Build data/hist.json: every completed trade involving the 'Rebuilding Morehouse's' manager across all past SHADYNASTY seasons
(+ drafted-player lookups for traded picks and names). Completed seasons never change, so this is static; the page fetches the
current season live from Sleeper and values everything live with FantasyCalc."""
import json, urllib.request, concurrent.futures as cf
API='https://api.sleeper.app/v1/'
def g(u):
    with urllib.request.urlopen(urllib.request.Request(API+u,headers={'User-Agent':'mascasa/1.0'}),timeout=60) as r: return json.load(r)
LEAGUE='1312055708249767936'
cur=g('league/'+LEAGUE); users=g(f'league/{LEAGUE}/users'); rosters=g(f'league/{LEAGUE}/rosters')
norm=lambda s:(s or '').replace('\u2019',"'").strip().lower()
r=[x for x in rosters for u in users if u['user_id']==x['owner_id'] and norm((u.get('metadata') or {}).get('team_name'))=="rebuilding morehouse's"][0]
UID=r['owner_id']
seasons=[];trades=[];picks={};ids=set()
lid=cur['previous_league_id']
while lid and lid!='0':
    lg=g('league/'+lid); us=g(f'league/{lid}/users'); rs=g(f'league/{lid}/rosters')
    U={u['user_id']:u for u in us}
    teams={x['roster_id']:{'own':x['owner_id'],'tn':((U.get(x['owner_id']) or {}).get('metadata') or {}).get('team_name') or (U.get(x['owner_id']) or {}).get('display_name') or 'Team %d'%x['roster_id']} for x in rs}
    me=[x['roster_id'] for x in rs if x['owner_id']==UID]
    me=me[0] if me else None
    jr=[x for x in rs if x['roster_id']==me][0]['settings'] if me else {}
    seasons.append({'season':lg['season'],'rid':me,'w':jr.get('wins',0),'l':jr.get('losses',0),'tn':teams[me]['tn'] if me else None})
    with cf.ThreadPoolExecutor(8) as ex: TX=list(ex.map(lambda w:g(f'league/{lid}/transactions/{w}'),range(1,19)))
    for tx in TX:
        for t in tx or []:
            if t['type']=='trade' and t['status']=='complete' and me in (t.get('roster_ids') or []):
                tr={'s':lg['season'],'wk':t.get('leg'),'at':t.get('status_updated'),'rid':me,'adds':t.get('adds') or {},
                    'pk':[{'s':p['season'],'r':p['round'],'o':p['roster_id'],'to':p['owner_id'],'fr':p['previous_owner_id']} for p in (t.get('draft_picks') or [])],
                    'tn':{str(k):teams.get(k,{}).get('tn') for k in t['roster_ids']}}
                trades.append(tr); ids.update(tr['adds'].keys())
    lid=lg['previous_league_id']
# drafted players for traded picks: walk drafts of every season in the chain (incl. current season's rookie draft)
lid=LEAGUE
while lid and lid!='0':
    lg=g('league/'+lid)
    for d in sorted(g(f'league/{lid}/drafts'),key=lambda d:-(d.get('start_time') or 0)):
        if d['status']!='complete' or str(d['season'])!=str(lg['season']) or int((d.get('settings') or {}).get('rounds',1))<2: continue
        dd=g('draft/'+d['draft_id']); s2r=dd.get('slot_to_roster_id') or {}
        dp=g('draft/'+d['draft_id']+'/picks')
        if not dp: continue
        for p in dp:
            o=s2r.get(str(p['draft_slot']))
            if o is not None: picks.setdefault('%s|%s|%s'%(lg['season'],p['round'],o),[p['player_id'],p['pick_no']]); ids.add(p['player_id'])
        break
    lid=lg['previous_league_id']
allp=g('players/nfl')
names={i:(allp.get(i) or {}).get('full_name') or ' '.join(filter(None,[(allp.get(i) or {}).get('first_name'),(allp.get(i) or {}).get('last_name')])) or 'Player '+i for i in ids}
json.dump({'uid':UID,'seasons':seasons,'trades':trades,'picks':picks,'names':names},open('data/hist.json','w'),separators=(',',':'),ensure_ascii=False)
print(len(seasons),'seasons',len(trades),'past trades',len(picks),'draft picks',len(names),'names')
