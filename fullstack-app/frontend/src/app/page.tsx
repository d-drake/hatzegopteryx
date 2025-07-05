'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/auth/Header';
import Image from 'next/image';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [showEmail, setShowEmail] = useState(false);

  const handleExploreDashboard = () => {
    router.push('/spc-dashboard/SPC_CD_L1/1000-BNT44');
  };

  const handleContactClick = () => {
    setShowEmail(true);
    // Copy email to clipboard
    navigator.clipboard.writeText('dwdrake90@gmail.com');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowEmail(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Content Side */}
            <div className="text-white space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                  Cloud Critical Dimension Hub
                </h1>
                <p className="text-xl lg:text-2xl text-slate-300 leading-relaxed">
                  Charting the past, present, and well-controlled future.
                </p>
              </div>

              {/* Bio Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-slate-600/30">
                <p className="text-lg leading-relaxed text-slate-100">
                  I am an engineer, an alpine skier, a lifelong learner, and a dedicated fan of the underdog.
                  My favorite things are club sandwiches, classic literature by Leo Tolstoy, and running
                  breathlessly with a stinky pack of dogs. I have worked in semiconductors for 8 years;
                  along the way, I have developed a passion for simplifying complicated data analysis for end users.
                </p>
                <p className="text-lg leading-relaxed text-slate-100 mt-4">
                  Please check out my dashboard to see a relatively recent yet light example of how I utilize
                  Python and JavaScript libraries to deliver legible, highly interactive, intelligent data
                  dashboards. Consider the dashboard an example of something I can readily expand or adapt to
                  meet the needs of various data relationships and user groups. I am prepared to deliver the
                  frontend, refine and optimize your data structures, utilize modern infrastructure options,
                  and consult with customers at every step along the way.
                </p>
              </div>

              {/* CTA Button */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleExploreDashboard}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
                >
                  Explore Dashboard
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>

                {user && (
                  <div className="text-sm text-slate-300 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Welcome back, {user.username}!
                  </div>
                )}
              </div>
            </div>

            {/* Images Side - Layered Design */}
            <div className="relative h-[600px] lg:h-[700px]">
              {/* Background decorative elements */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-3xl"></div>

              {/* Layered Images Container */}
              <div className="relative h-full flex items-center justify-center">

                {/* Image 1 - Back layer (positioned right-center for visibility) */}
                <div className="absolute top-1/2 right-16 lg:right-24 transform -translate-y-1/2 translate-x-8 w-72 h-96 lg:w-80 lg:h-[480px] rotate-[3deg] shadow-2xl rounded-lg overflow-hidden">
                  <Image
                    src="/images/profile-1.jpg"
                    alt="Alpine skiing adventure"
                    fill
                    className="object-cover filter grayscale-50 hover:grayscale-0 transition-all duration-500"
                    sizes="(max-width: 768px) 288px, 320px"
                    priority
                  />
                  <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition-all duration-500"></div>
                </div>

                {/* Image 2 - Middle layer (more centered, less rotation) */}
                <div className="absolute top-1/2 left-16 lg:left-24 transform -translate-y-1/2 -translate-x-8 w-64 h-80 lg:w-72 lg:h-96 rotate-[-4deg] shadow-2xl rounded-lg overflow-hidden">
                  <Image
                    src="/images/profile-2.jpg"
                    alt="Engineering and adventure"
                    fill
                    className="object-cover filter sepia-50 hover:sepia-0 transition-all duration-500"
                    sizes="(max-width: 768px) 256px, 288px"
                  />
                  <div className="absolute inset-0 bg-amber-900/20 hover:bg-amber-900/0 transition-all duration-500"></div>
                </div>

                {/* Image 3 - Front layer (centered) */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 translate-y-12 w-56 h-72 lg:w-64 lg:h-80 rotate-[1deg] shadow-2xl rounded-lg overflow-hidden">
                  <Image
                    src="/images/profile-3.jpg"
                    alt="Outdoor exploration"
                    fill
                    className="object-cover filter brightness-95 hover:brightness-100 transition-all duration-500"
                    sizes="(max-width: 768px) 224px, 256px"
                  />
                  <div className="absolute inset-0 bg-slate-900/10 hover:bg-slate-900/0 transition-all duration-500"></div>
                </div>

                {/* Hover effect to bring images forward */}
                <style jsx>{`
                  div:hover {
                    z-index: 40 !important;
                  }
                `}</style>

                {/* Floating accent elements */}
                <div className="absolute top-4 right-4 w-3 h-3 bg-blue-400 rounded-full opacity-60 animate-pulse"></div>
                <div className="absolute bottom-12 right-8 w-2 h-2 bg-purple-400 rounded-full opacity-60 animate-pulse delay-1000"></div>
                <div className="absolute top-1/3 left-4 w-4 h-4 bg-amber-400 rounded-full opacity-40 animate-pulse delay-500"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="w-full h-12 text-gray-50" fill="currentColor" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z"></path>
          </svg>
        </div>
      </section>

      {/* Features Preview Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Interactive Data Visualization
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Visit the dashboard example to experience modern SPC (Statistical Process Control) data visualization with advanced
              interactive charts, real-time filtering, and comprehensive control limits integration designed
              for rapid analytics.
            </p>

            {/* Feature highlights */}
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Real-time Charts</h3>
                <p className="text-gray-600">D3.js-powered interactive visualizations with zoom, pan, and filtering capabilities.</p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">SPC Analytics</h3>
                <p className="text-gray-600">Statistical process control with dynamic control limits and trend analysis.</p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Manufacturing Focus</h3>
                <p className="text-gray-600">Example provided with semiconductor mfg. QC and process analysis in mind.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Contact Button */}
      <div className="fixed bottom-8 right-8 z-50">
        {/* Email Tooltip */}
        {showEmail && (
          <div className="absolute bottom-full right-0 mb-3 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-slate-800/95 backdrop-blur-md text-white px-4 py-3 rounded-lg shadow-2xl border border-slate-600/30">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">dwdrake90@gmail.com</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">Copied to clipboard!</div>
              {/* Tooltip arrow */}
              <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-slate-800/95"></div>
            </div>
          </div>
        )}
        
        {/* Contact Button */}
        <button
          onClick={handleContactClick}
          className="group relative w-14 h-14 bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-full shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 overflow-hidden"
        >
          {/* Pulse animation ring - subtle, once per minute with slower pulse */}
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-[slowPulse_60s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
          
          {/* Button content */}
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          {/* Hover glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/0 via-blue-500/0 to-purple-600/0 group-hover:from-blue-600/20 group-hover:via-blue-500/20 group-hover:to-purple-600/20 transition-all duration-300"></div>
        </button>
      </div>
    </div>
  );
}