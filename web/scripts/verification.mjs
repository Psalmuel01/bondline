// Pure condition validation/evaluation shared by the worker and tests.
export function parseGithubSpec(raw) {
  const input=JSON.parse(raw);
  if(input.type!=='github'||typeof input.repo!=='string'||! /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(input.repo)||['.','..'].includes(input.repo.split('/')[1])||typeof input.author!=='string'||! /^[a-zA-Z0-9-]{1,39}$/.test(input.author)||!Number.isInteger(input.commits)||input.commits<1||input.commits>100)throw new Error('Invalid GitHub condition');
  return input;
}
export function countCommits(data, spec, start, deadline) {
  if(!Array.isArray(data)||data.length>100)throw new Error('Invalid GitHub response');
  const hashes=new Set();
  for(const item of data) {
    if(typeof item.sha!=='string'||! /^[a-f0-9]{40}$/i.test(item.sha)||!item.commit?.author?.date)throw new Error('Invalid commit');
    const time=Date.parse(item.commit.author.date)/1000;
    if(!Number.isFinite(time))throw new Error('Invalid commit timestamp');
    if(item.author?.login?.toLowerCase()===spec.author.toLowerCase()&&time>=start&&time<deadline)hashes.add(item.sha);
  }
  return [...hashes].sort();
}
