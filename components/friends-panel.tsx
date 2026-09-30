'use client';

import { useEffect, useState } from 'react';

type FriendRecord = {
  id: string;
  status: string;
  direction: 'sent' | 'received';
  user: { id: string; name: string | null; email: string; username: string | null };
};

export function FriendsPanel() {
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadFriends() {
    const response = await fetch('/api/friends');
    if (response.ok) setFriends(await response.json());
    setLoading(false);
  }

  useEffect(() => {
    void loadFriends();
  }, []);

  async function sendRequest(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? 'Could not send friend request.');
      return;
    }
    setTarget('');
    await loadFriends();
  }

  async function updateRequest(friend: FriendRecord, status: 'ACCEPTED' | 'DECLINED' | 'BLOCKED') {
    setError('');
    const response = await fetch(`/api/friends/${friend.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? 'Could not update friend request.');
      return;
    }
    await loadFriends();
  }

  async function removeFriend(friend: FriendRecord) {
    const response = await fetch(`/api/friends/${friend.id}`, { method: 'DELETE' });
    if (response.ok) await loadFriends();
  }

  return (
    <div className="mt-6 max-w-4xl">
      <form onSubmit={sendRequest} className="flex gap-2 border-b border-slate-200 pb-5">
        <input aria-label="Username or email" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Username or email" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2" required />
        <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white">Send request</button>
      </form>

      {error && <p role="status" className="mt-3 text-sm text-red-600">{error}</p>}
      {loading ? <p className="mt-5 text-sm text-slate-600">Loading friends...</p> : friends.length === 0 ? (
        <p className="mt-5 text-sm text-slate-600">No friend connections yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200">
          {friends.map((friend) => (
            <li key={friend.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium text-slate-900">{friend.user.name ?? friend.user.username ?? friend.user.email}</p>
                <p className="text-sm text-slate-600">{friend.status.toLowerCase()} {friend.status === 'PENDING' ? `· ${friend.direction}` : ''}</p>
              </div>
              <div className="flex gap-2">
                {friend.status === 'PENDING' && friend.direction === 'received' && <button type="button" onClick={() => updateRequest(friend, 'ACCEPTED')} className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm text-white">Accept</button>}
                {friend.status === 'PENDING' && friend.direction === 'received' && <button type="button" onClick={() => updateRequest(friend, 'DECLINED')} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Decline</button>}
                {friend.status !== 'BLOCKED' && <button type="button" onClick={() => updateRequest(friend, 'BLOCKED')} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Block</button>}
                {friend.status === 'ACCEPTED' && <button type="button" onClick={() => removeFriend(friend)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Remove</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}