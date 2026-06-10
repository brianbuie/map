import { getAdsb } from '../api/fetchers/adsb';

async function monitor() {
  const { aircraft } = await getAdsb();
  console.clear();
  aircraft
    .filter(a => a.category && a.t)
    .map(a => `${a.category} - ${a.t}`)
    .forEach(a => console.log(a));
}

setInterval(() => {
  monitor();
}, 4000);
