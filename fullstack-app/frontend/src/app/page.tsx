"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/auth/Header";
import Image from "next/image";
import { getDefaultSPCRouteSync } from "@/lib/spc-dashboard/defaultRouteUtils";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [showEmail, setShowEmail] = useState(false);
  const [activeImage, setActiveImage] = useState<number | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get default route dynamically
  const defaultDashboardRoute = useMemo(
    () => getDefaultSPCRouteSync("/spc-dashboard"),
    []
  );

  const handleExploreDashboard = () => {
    router.push(defaultDashboardRoute);
  };

  const handleContactClick = () => {
    setShowEmail(true);
    // Copy email to clipboard
    navigator.clipboard.writeText("dwdrake90@gmail.com");

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowEmail(false);
    }, 3000);
  };

  const handleImageClick = (imageIndex: number) => {
    setActiveImage(imageIndex);
    // Clear any existing timer when clicking
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  const handleMouseLeaveImages = () => {
    // Start 3-second timer to reset images
    resetTimerRef.current = setTimeout(() => {
      setActiveImage(null);
    }, 3000);
  };

  const handleMouseEnterImages = () => {
    // Cancel reset timer if mouse re-enters
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  // Calculate z-index for each image based on active selection
  const getImageZIndex = (imageNumber: number): string => {
    if (activeImage === null) {
      // Default order when no image is selected
      switch (imageNumber) {
        case 1: // profile-3 center - highest
          return "z-40";
        case 2: // profile-2 top - 2nd
          return "z-30";
        case 3: // profile-4 lower right - 3rd
          return "z-20";
        case 4: // profile-5 lower left - 4th
          return "z-10";
        default:
          return "z-0";
      }
    }

    // When an image is selected
    if (imageNumber === activeImage) return "z-50";

    // Determine order for non-selected images
    const baseOrder = [40, 30, 20, 10];
    return `z-${baseOrder[imageNumber - 1] - 5}`;
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
                  I am an engineer, an alpine skier, a lifelong learner, and a
                  dedicated fan of the underdog. My favorite things are club
                  sandwiches, classic literature by Leo Tolstoy, and running
                  breathlessly with a stinking pack of dogs. I have worked in
                  semiconductors for 8 years; along the way, I have developed a
                  passion for simplifying complicated data analysis for end
                  users.
                </p>
                <p className="text-lg leading-relaxed text-slate-100 mt-4">
                  Please check out my dashboard to see a relatively recent yet
                  light example of how I utilize Python and JavaScript libraries
                  to deliver legible, highly interactive, intelligent data
                  dashboards. Consider the dashboard an example of something I
                  can readily expand or adapt to meet the needs of various data
                  relationships and user groups. I am prepared to deliver the
                  frontend, refine and optimize your data structures, utilize
                  modern infrastructure options, and consult with customers at
                  every step along the way.
                </p>
              </div>

              {/* CTA Button */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleExploreDashboard}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
                >
                  Explore Dashboard
                  <svg
                    className="ml-2 w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </button>

                {user && (
                  <div className="text-sm text-slate-300 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
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

              {/* Layered Images Container - Centered 4-Photo Arrangement */}
              <div
                className="relative h-full flex items-center justify-center"
                onMouseEnter={handleMouseEnterImages}
                onMouseLeave={handleMouseLeaveImages}
              >
                {/* Image 1 - Professional headshot - Center (highest z-index) */}
                <div
                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 translate-y-8 w-60 h-72 lg:w-64 lg:h-80 rotate-[-2deg] shadow-2xl rounded-lg overflow-hidden transition-z cursor-pointer ${getImageZIndex(1)}`}
                  onClick={() => handleImageClick(1)}
                >
                  <Image
                    src="/images/profile-3.jpg"
                    alt="Professional headshot"
                    fill
                    className={`object-cover filter transition-all duration-1200 ease-smooth-out ${activeImage === 1 ? "brightness-100" : "brightness-95"}`}
                    sizes="(max-width: 768px) 240px, 256px"
                    priority
                  />
                  <div
                    className={`absolute inset-0 transition-all duration-800 ease-smooth pointer-events-none ${activeImage === 1 ? "bg-slate-900/0" : "bg-slate-900/10"}`}
                  ></div>
                </div>

                {/* Image 2 - Skiing - Top center (2nd z-index) */}
                <div
                  className={`absolute top-24 left-1/2 transform -translate-x-1/2 w-56 h-[272px] lg:w-60 lg:h-72 rotate-[3deg] shadow-2xl rounded-lg overflow-hidden transition-z cursor-pointer ${getImageZIndex(2)}`}
                  onClick={() => handleImageClick(2)}
                >
                  <Image
                    src="/images/profile-2.jpg"
                    alt="Alpine skiing adventure"
                    fill
                    className={`object-cover filter transition-all duration-1200 ease-smooth-out ${activeImage === 2 ? "grayscale-0" : "grayscale-50"}`}
                    sizes="(max-width: 768px) 224px, 240px"
                  />
                  <div
                    className={`absolute inset-0 transition-all duration-800 ease-smooth pointer-events-none ${activeImage === 2 ? "bg-black/0" : "bg-black/10"}`}
                  ></div>
                </div>

                {/* Image 3 - Life moments - Lower right (3rd z-index) */}
                <div
                  className={`absolute bottom-32 right-4 min-[400px]:right-8 min-[500px]:right-12 sm:right-20 lg:right-32 w-52 h-64 lg:w-56 lg:h-[272px] rotate-[6deg] shadow-2xl rounded-lg overflow-hidden transition-z cursor-pointer ${getImageZIndex(3)}`}
                  onClick={() => handleImageClick(3)}
                >
                  <Image
                    src="/images/profile-5.jpg"
                    alt="Life moments"
                    fill
                    className={`object-cover filter transition-all duration-1200 ease-smooth-out ${activeImage === 3 ? "hue-rotate-0" : "hue-rotate-15"}`}
                    sizes="(max-width: 768px) 208px, 224px"
                  />
                  <div
                    className={`absolute inset-0 transition-all duration-800 ease-smooth pointer-events-none ${activeImage === 3 ? "bg-purple-900/0" : "bg-purple-900/10"}`}
                  ></div>
                </div>

                {/* Image 4 - Dog - Lower left (4th z-index) */}
                <div
                  className={`absolute bottom-32 left-4 min-[400px]:left-8 min-[500px]:left-12 sm:left-20 lg:left-32 w-52 h-64 lg:w-56 lg:h-[272px] rotate-[-5deg] shadow-2xl rounded-lg overflow-hidden transition-z cursor-pointer ${getImageZIndex(4)}`}
                  onClick={() => handleImageClick(4)}
                >
                  <Image
                    src="/images/profile-4.jpeg"
                    alt="With furry companion"
                    fill
                    className={`object-cover object-top filter transition-all duration-1200 ease-smooth-out ${activeImage === 4 ? "sepia-0" : "sepia-50"}`}
                    sizes="(max-width: 768px) 208px, 224px"
                  />
                  <div
                    className={`absolute inset-0 transition-all duration-800 ease-smooth pointer-events-none ${activeImage === 4 ? "bg-amber-900/0" : "bg-amber-900/20"}`}
                  ></div>
                </div>

                {/* Hover effect handled via Tailwind classes in each image div */}

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
          <svg
            className="w-full h-12 text-gray-50"
            fill="currentColor"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
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
              Visit the dashboard example to experience modern SPC (Statistical
              Process Control) data visualization with advanced interactive
              charts, real-time filtering, and comprehensive control limits
              integration designed for rapid analytics.
            </p>

            {/* Feature highlights */}
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Real-time Charts
                </h3>
                <p className="text-gray-600">
                  D3.js-powered interactive visualizations with zoom, pan, and
                  filtering capabilities.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  SPC Analytics
                </h3>
                <p className="text-gray-600">
                  Statistical process control with dynamic control limits and
                  trend analysis.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Manufacturing Focus
                </h3>
                <p className="text-gray-600">
                  Example provided with semiconductor mfg. QC and process
                  analysis in mind.
                </p>
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
                <svg
                  className="w-4 h-4 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium">dwdrake90@gmail.com</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Copied to clipboard!
              </div>
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
            <svg
              className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Hover glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/0 via-blue-500/0 to-purple-600/0 group-hover:from-blue-600/20 group-hover:via-blue-500/20 group-hover:to-purple-600/20 transition-all duration-300"></div>
        </button>
      </div>
    </div>
  );
}
