import React, { useState } from 'react';
export const LoginForm = ({ onSubmit }: any) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(u, p); }} className="flex flex-col gap-4 max-w-sm mx-auto mt-20">
      <input className="border p-2 rounded" placeholder="Username" value={u} onChange={e => setU(e.target.value)} />
      <input className="border p-2 rounded" type="password" placeholder="Password" value={p} onChange={e => setP(e.target.value)} />
      <button className="bg-blue-600 text-white p-2 rounded font-bold" type="submit">Login</button>
    </form>
  );
};
