import React from 'react';
import '../../src/index.css';

export default function HomeWeb() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-8 safe-area-top safe-area-bottom">
      <header className="w-full max-w-6xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center glow-primary">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15 8H9L12 2Z" fill="white" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-semibold text-white">VibeShift</div>
            <div className="text-sm text-muted-foreground">Sound design studio</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">Hi, Insiya</div>
          <div className="w-12 h-12 rounded-full bg-card/60 border border-primary/30 flex items-center justify-center glow-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12a5 5 0 100-10 5 5 0 000 10zM3 21a9 9 0 0118 0" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl flex gap-8">
        <section className="flex-1">
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold">Create</div>
                <div className="text-sm text-muted-foreground">Jump into a demix or transform your songs</div>
              </div>
              <div className="flex items-center gap-3">
                <a href="/demixing" className="px-4 py-2 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white">Demixing</a>
                <a href="/genre-transform" className="px-4 py-2 rounded-lg bg-gradient-to-br from-green-400 to-teal-400 text-white">Genre Transform</a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <a href="/demixing" className="glass-card p-6 hover:glow-primary transition-shadow" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 88, height: 88, borderRadius: 18, background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}></div>
              <div>
                <div className="text-lg font-bold">Demix an audio file</div>
                <div className="text-sm text-muted-foreground">Split songs into stems like vocal, drums, bass.</div>
              </div>
            </a>

            <a href="/genre-transform" className="glass-card p-6 hover:glow-secondary transition-shadow" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 88, height: 88, borderRadius: 18, background: 'linear-gradient(135deg, #06B6D4, #34D399)' }}></div>
              <div>
                <div className="text-lg font-bold">Transform genres</div>
                <div className="text-sm text-muted-foreground">Convert tracks to new styles with AI.</div>
              </div>
            </a>
          </div>
        </section>

        <aside style={{ width: 360 }}>
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">Recently Edited</div>
              <a href="/library" className="text-sm text-primary">See all</a>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50">
                <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}></div>
                <div className="flex-1">
                  <div className="font-semibold">Midnight Swim</div>
                  <div className="text-xs text-muted-foreground">Edited 2 days ago</div>
                </div>
                <div className="text-sm text-muted-foreground">4:32</div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50">
                <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#06B6D4,#34D399)' }}></div>
                <div className="flex-1">
                  <div className="font-semibold">Sunset Drive</div>
                  <div className="text-xs text-muted-foreground">Edited 5 days ago</div>
                </div>
                <div className="text-sm text-muted-foreground">3:12</div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50">
                <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#F97316,#FB7185)' }}></div>
                <div className="flex-1">
                  <div className="font-semibold">Lost & Found</div>
                  <div className="text-xs text-muted-foreground">Edited 1 week ago</div>
                </div>
                <div className="text-sm text-muted-foreground">5:03</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="text-sm text-muted-foreground mb-3">Quick Actions</div>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white">Upload</button>
              <button className="px-4 py-2 rounded-lg bg-muted text-white">New Project</button>
            </div>
          </div>
        </aside>
      </main>

      <nav className="w-full max-w-6xl flex items-center justify-between mt-8">
        <div className="glass-card w-full p-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="text-sm text-muted-foreground">Home</a>
            <a href="/library" className="text-sm text-muted-foreground">Library</a>
            <a href="/profile" className="text-sm text-muted-foreground">Profile</a>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-card/60 border border-primary/30 flex items-center justify-center glow-primary"> </div>
            <div className="w-10 h-10 rounded-full bg-card/60 border border-primary/30 flex items-center justify-center glow-accent"> </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
