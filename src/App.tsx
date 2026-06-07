import React from 'react';
import { siteContent } from './data/content';
import { Target, Users, Shield, MapPin, Mail, Phone, ChevronRight, Menu, X, Facebook, Instagram } from 'lucide-react';
import logo from './assets/logo.png';

function App() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="min-h-screen bg-black text-white font-sans scroll-smooth">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img src={logo} alt="CMP Logo" className="h-12 w-auto brightness-0 invert" />
              <span className="font-bold text-2xl tracking-tighter uppercase">{siteContent.brand.name}</span>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#home" className="hover:text-wrestling-red px-3 py-2 text-sm font-medium uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wrestling-red">Home</a>
                <a href="#about" className="hover:text-wrestling-red px-3 py-2 text-sm font-medium uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wrestling-red">About</a>
                <a href="#camps" className="hover:text-wrestling-red px-3 py-2 text-sm font-medium uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wrestling-red">Camps</a>
                <a href="#satellite" className="hover:text-wrestling-red px-3 py-2 text-sm font-medium uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wrestling-red">Satellite</a>
                <a href="#contact" className="hover:text-wrestling-red px-3 py-2 text-sm font-medium uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wrestling-red">Contact</a>
              </div>
            </div>

            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wrestling-red"
                aria-expanded={isMenuOpen}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-black border-b border-white/10">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a href="#home" onClick={toggleMenu} className="block px-3 py-2 text-base font-medium uppercase hover:text-wrestling-red">Home</a>
              <a href="#about" onClick={toggleMenu} className="block px-3 py-2 text-base font-medium uppercase hover:text-wrestling-red">About</a>
              <a href="#camps" onClick={toggleMenu} className="block px-3 py-2 text-base font-medium uppercase hover:text-wrestling-red">Camps</a>
              <a href="#satellite" onClick={toggleMenu} className="block px-3 py-2 text-base font-medium uppercase hover:text-wrestling-red">Satellite</a>
              <a href="#contact" onClick={toggleMenu} className="block px-3 py-2 text-base font-medium uppercase hover:text-wrestling-red">Contact</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black z-10" />
          <div className="w-full h-full bg-wrestling-grey opacity-20 flex items-center justify-center">
             <Target size={400} className="text-white/5 rotate-12" aria-hidden="true" />
          </div>
        </div>

        <div className="relative z-20 text-center px-4 max-w-5xl">
          <h2 className="text-wrestling-red font-bold tracking-[0.3em] uppercase mb-4 animate-fade-in">
            {siteContent.brand.tagline}
          </h2>
          <h1 className="text-6xl md:text-9xl font-black uppercase mb-6 tracking-tighter leading-none">
            {siteContent.brand.name}
          </h1>
          <p className="text-xl md:text-2xl text-wrestling-silver mb-8 max-w-3xl mx-auto leading-relaxed">
            {siteContent.brand.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#camps" className="bg-wrestling-red hover:bg-red-700 text-white font-bold py-4 px-10 rounded-none transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              FIND A CAMP <ChevronRight size={20} />
            </a>
            <a href="#satellite" className="border border-white/20 hover:bg-white/10 text-white font-bold py-4 px-10 rounded-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wrestling-red">
              BRING US TO YOU
            </a>
          </div>
        </div>
      </section>

      {/* About/Mission Section */}
      <section id="about" className="py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black uppercase mb-8 italic leading-tight">
                Beyond The <span className="text-wrestling-red text-6xl block mt-2">Mat</span>
              </h2>
              <p className="text-xl text-wrestling-silver mb-8 leading-relaxed italic border-l-4 border-wrestling-red pl-6">
                "{siteContent.brand.mission}"
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12">
                <div className="flex flex-col gap-4">
                  <Shield className="text-wrestling-red" size={32} aria-hidden="true" />
                  <h3 className="font-bold text-xl uppercase">Character</h3>
                  <p className="text-wrestling-silver text-sm">Building men of integrity and resilience through the sport of wrestling.</p>
                </div>
                <div className="flex flex-col gap-4">
                  <Target className="text-wrestling-red" size={32} aria-hidden="true" />
                  <h3 className="font-bold text-xl uppercase">Performance</h3>
                  <p className="text-wrestling-silver text-sm">Employing structurally sound technique from around the world.</p>
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-wrestling-red/20 group-hover:bg-wrestling-red/30 transition duration-500"></div>
              <div className="relative h-[500px] bg-zinc-900 border border-white/10 flex items-center justify-center">
                <span className="text-wrestling-silver italic">[CMP TRAINING PHOTO]</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Camps Section */}
      <section id="camps" className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 italic">Technical Mastery</h2>
            <div className="h-1.5 w-32 bg-wrestling-red mx-auto mb-6" />
            <p className="text-wrestling-silver max-w-2xl mx-auto text-lg">Our specialized camps focus on high-percentage scoring and dominance from every position.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {siteContent.featuredCamps.map((camp, idx) => (
              <div key={idx} className="group bg-zinc-950 p-8 border-t-4 border-wrestling-red hover:bg-zinc-900 transition-all duration-300 transform hover:-translate-y-2">
                <div className="mb-6 flex justify-between items-start">
                   <Target className="text-wrestling-red opacity-50 group-hover:opacity-100 transition" size={40} aria-hidden="true" />
                   <span className="text-4xl font-black text-white/5 group-hover:text-wrestling-red/10 transition">0{idx + 1}</span>
                </div>
                <h3 className="text-2xl font-bold uppercase mb-4 group-hover:text-wrestling-red transition">{camp.title}</h3>
                <p className="text-wrestling-silver leading-relaxed mb-6">{camp.description}</p>
                <button className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                  Learn More <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Satellite Camps Section */}
      <section id="satellite" className="py-24 bg-zinc-950 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-wrestling-red p-12 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
              <Users size={400} className="-mr-20 -mt-20" aria-hidden="true" />
            </div>
            <div className="relative z-10 max-w-3xl">
              <h2 className="text-4xl md:text-6xl font-black uppercase mb-6 leading-none">
                {siteContent.satelliteCamps.title}
              </h2>
              <p className="text-xl md:text-2xl mb-10 opacity-90 leading-relaxed font-medium">
                {siteContent.satelliteCamps.description}
              </p>
              <a href="#contact" className="inline-block bg-black text-white font-bold py-5 px-12 uppercase tracking-tighter hover:bg-zinc-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                {siteContent.satelliteCamps.cta}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-4xl font-black uppercase mb-8 italic">Get In Touch</h2>
              <p className="text-lg text-wrestling-silver mb-12 leading-relaxed">
                Have questions about our camps or want to schedule a satellite clinic? Reach out to us today.
              </p>

              <div className="space-y-8">
                <div className="flex gap-6 items-center group">
                  <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center border border-white/10 group-hover:border-wrestling-red transition">
                    <MapPin className="text-wrestling-red" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs uppercase font-bold text-wrestling-silver">Headquarters</p>
                    <p className="font-bold text-lg">{siteContent.contact.address}</p>
                  </div>
                </div>

                <div className="flex gap-6 items-center group">
                  <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center border border-white/10 group-hover:border-wrestling-red transition">
                    <Phone className="text-wrestling-red" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs uppercase font-bold text-wrestling-silver">Phone</p>
                    <p className="font-bold text-lg">{siteContent.contact.phone}</p>
                  </div>
                </div>

                <div className="flex gap-6 items-center group">
                  <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center border border-white/10 group-hover:border-wrestling-red transition">
                    <Mail className="text-wrestling-red" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs uppercase font-bold text-wrestling-silver">Email</p>
                    <p className="font-bold text-lg">{siteContent.contact.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-950 p-10 border border-white/5">
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase font-bold mb-2 text-wrestling-silver">Name</label>
                    <input type="text" className="w-full bg-black border border-white/10 p-4 focus:outline-none focus:border-wrestling-red transition" placeholder="Your Name" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase font-bold mb-2 text-wrestling-silver">Email</label>
                    <input type="email" className="w-full bg-black border border-white/10 p-4 focus:outline-none focus:border-wrestling-red transition" placeholder="your@email.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold mb-2 text-wrestling-silver">Message</label>
                  <textarea className="w-full bg-black border border-white/10 p-4 h-40 focus:outline-none focus:border-wrestling-red transition" placeholder="How can we help?"></textarea>
                </div>
                <button type="submit" className="w-full bg-wrestling-red hover:bg-red-700 text-white font-bold py-4 uppercase tracking-widest transition">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center">
            <img src={logo} alt="CMP Logo" className="h-20 w-auto brightness-0 invert mb-6" />
            <h2 className="font-bold text-3xl tracking-tighter uppercase mb-4">{siteContent.brand.name}</h2>
            <p className="text-wrestling-red font-bold tracking-[0.2em] uppercase mb-10 text-sm">
              {siteContent.brand.tagline}
            </p>

            <div className="flex space-x-8 mb-12">
              <a href={siteContent.contact.facebook} className="text-wrestling-silver hover:text-white transition transform hover:scale-110" aria-label="Facebook">
                <Facebook size={24} />
              </a>
              <a href={siteContent.contact.instagram} className="text-wrestling-silver hover:text-white transition transform hover:scale-110" aria-label="Instagram">
                <Instagram size={24} />
              </a>
            </div>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-12 text-sm uppercase font-bold text-wrestling-silver">
              <a href="#home" className="hover:text-wrestling-red transition">Home</a>
              <a href="#about" className="hover:text-wrestling-red transition">About</a>
              <a href="#camps" className="hover:text-wrestling-red transition">Camps</a>
              <a href="#satellite" className="hover:text-wrestling-red transition">Satellite</a>
              <a href="#contact" className="hover:text-wrestling-red transition">Contact</a>
            </div>

            <div className="text-center border-t border-white/5 pt-8 w-full">
              <p className="text-wrestling-silver text-xs">
                &copy; {new Date().getFullYear()} {siteContent.brand.name}. All rights reserved.
                <span className="block mt-2 opacity-50 uppercase tracking-widest">Transcend The Status Quo</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
