import { createHash, randomUUID } from 'node:crypto';
import { privateKeyToAccount } from 'viem/accounts';
import { hexToBytes } from 'viem';

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export async function createExecutionRequest({ workflowId, commitmentId, privateKey, now = Math.floor(Date.now()/1000), requestId = randomUUID(), jwtId = randomUUID() }) {
  if (!/^[a-f0-9]{64}$/i.test(workflowId) || !/^(0|[1-9][0-9]{0,77})$/.test(commitmentId)) throw new Error('Invalid execution request');
  const account = privateKeyToAccount(privateKey);
  const body = canonicalJson({ id: requestId, jsonrpc: '2.0', method: 'workflows.execute', params: { input: { commitmentId }, workflow: { workflowID: workflowId } } });
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const message = `${encode({alg:'ETH',typ:'JWT'})}.${encode({digest:`0x${createHash('sha256').update(body).digest('hex')}`,iss:account.address,iat:now,exp:now+120,jti:jwtId})}`;
  const signature = await account.signMessage({ message });
  return { body, token: `${message}.${Buffer.from(hexToBytes(signature)).toString('base64url')}`, requestId };
}
