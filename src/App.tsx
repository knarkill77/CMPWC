import React from 'react';
import { siteContent } from './data/content';
import { Trophy, Calendar, MapPin, Mail, ChevronRight, Menu, X } from 'lucide-react';
import logo from './assets/logo.png';

function App() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-wrestling-red focus:text-white focus:px-4 focus:py-2 focus:font-bold focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to content
      </a>

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src={logo} alt="CMP Logo" className="h-10 w-auto brightness-0 invert" />
              <span className="font-bold text-xl tracking-tighter uppercase">{siteContent.event.name}</span>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#home" className="hover:text-wrestling-red px-3 py-2 text-sm font-medium uppercase transition">Home</a>
                <a href="#teams" className="hover:text-wrestling-red px-3 py-2 text-sm font-medium uppercase transition">Teams</a>
                <a href="#schedule" className="hover:text-wrestling-red px-3 py-2 text-sm font-medium uppercase transition">Schedule</a>
                <a href="#details" className="hover:text-wrestling-red px-3 py-2 text-sm font-medium uppercase transition">Details</a>
              </div>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-black border-b border-white/10">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a href="#home" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium uppercase">Home</a>
              <a href="#teams" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium uppercase">Teams</a>
              <a href="#schedule" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium uppercase">Schedule</a>
              <a href="#details" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-base font-medium uppercase">Details</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        className="relative h-screen flex items-center justify-center overflow-hidden pt-16"
      >
        <div id="main-content" tabIndex={-1} className="outline-none" />
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black z-10" />
          <div className="w-full h-full bg-wrestling-grey opacity-20 flex items-center justify-center">
             <Trophy size={400} className="text-white/5 rotate-12" aria-hidden="true" />
          </div>
        </div>

        <div className="relative z-20 text-center px-4 max-w-4xl">
          <h2 className="text-wrestling-red font-bold tracking-[0.2em] uppercase mb-4 animate-fade-in">
            {siteContent.event.tagline}
          </h2>
          <h1 className="text-6xl md:text-8xl font-black uppercase mb-6 tracking-tighter leading-none">
            {siteContent.event.name}
          </h1>
          <p className="text-xl md:text-2xl text-wrestling-silver mb-8 max-w-2xl mx-auto">
            {siteContent.event.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#details" className="bg-wrestling-red hover:bg-red-700 text-white font-bold py-4 px-8 rounded-none transition flex items-center justify-center gap-2">
              EVENT DETAILS <ChevronRight size={20} aria-hidden="true" />
            </a>
            <a href="#teams" className="border border-white/20 hover:bg-white/10 text-white font-bold py-4 px-8 rounded-none transition">
              VIEW TEAMS
            </a>
          </div>
        </div>
      </section>

      {/* Info Bar */}
      <div className="bg-wrestling-red py-6 relative z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <Calendar className="text-white" aria-hidden="true" />
              <div>
                <p className="text-xs uppercase font-bold opacity-80">Date</p>
                <p className="font-bold">{siteContent.event.date}</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-4 border-y md:border-y-0 md:border-x border-white/20 py-4 md:py-0">
              <MapPin className="text-white" aria-hidden="true" />
              <div>
                <p className="text-xs uppercase font-bold opacity-80">Venue</p>
                <p className="font-bold">{siteContent.event.venue.name}</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-4">
              <Trophy className="text-white" aria-hidden="true" />
              <div>
                <p className="text-xs uppercase font-bold opacity-80">Competition</p>
                <p className="font-bold">National Prep Teams</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Section */}
      <section id="teams" className="py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black uppercase mb-4 italic">The Lineup</h2>
            <div className="h-1 w-24 bg-wrestling-red mx-auto" />
            <p className="mt-4 text-wrestling-silver">Invited teams from across the nation</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {siteContent.teams.map((team, idx) => (
              <div key={idx} className="bg-black p-6 border-l-4 border-wrestling-red hover:bg-zinc-900 transition">
                <h3 className="text-xl font-bold uppercase">{team.name}</h3>
                <p className="text-sm text-wrestling-silver">{team.location}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section id="schedule" className="py-24 bg-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black uppercase mb-4 italic">Schedule</h2>
            <div className="h-1 w-24 bg-wrestling-red mx-auto" />
          </div>

          <div className="space-y-12">
            {siteContent.schedule.map((day, idx) => (
              <div key={idx}>
                <h3 className="text-2xl font-bold text-wrestling-red uppercase mb-6 flex items-center gap-3">
                  <Calendar size={24} aria-hidden="true" /> {day.day}
                </h3>
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  {day.events.map((event, eIdx) => (
                    <div key={eIdx} className={`flex p-4 ${eIdx % 2 === 0 ? 'bg-zinc-900/50' : 'bg-transparent'} border-b border-white/5 last:border-0`}>
                      <div className="w-32 font-bold text-wrestling-silver">{event.time}</div>
                      <div className="font-medium">{event.activity}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section id="details" className="py-24 bg-zinc-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black uppercase mb-6 italic">Venue & Details</h2>
              <p className="text-lg text-wrestling-silver mb-8 leading-relaxed">
                Elite 8 Duals is hosted at the premier Georgia International Convention Center.
                Experience top-tier wrestling in a showcase environment designed for athletes and fans alike.
              </p>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <MapPin className="text-wrestling-red flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-bold">{siteContent.event.venue.name}</p>
                    <p className="text-wrestling-silver">{siteContent.event.venue.address}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Mail className="text-wrestling-red flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-bold">Contact Organizer</p>
                    <p className="text-wrestling-silver">
                      {siteContent.contact.name} - <a href={`mailto:${siteContent.contact.email}`} className="hover:text-wrestling-red transition-colors">{siteContent.contact.email}</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-96 bg-zinc-900 flex items-center justify-center border border-white/10">
              <span className="text-wrestling-silver italic">[VENUE MAP / PHOTO PLACEHOLDER]</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-col items-center justify-center gap-2 mb-6">
            <img src={logo} alt="CMP Logo" className="h-16 w-auto brightness-0 invert mb-2" />
            <span className="font-bold text-lg tracking-tighter uppercase">{siteContent.event.name}</span>
          </div>
          <p className="text-wrestling-silver text-sm mb-8">
            &copy; {new Date().getFullYear()} Elite 8 Duals. All rights reserved.
          </p>
          <div className="flex justify-center space-x-6 text-wrestling-silver">
            <a href="#" className="hover:text-white transition">Instagram</a>
            <a href="#" className="hover:text-white transition">Facebook</a>
            <a href="#" className="hover:text-white transition">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
