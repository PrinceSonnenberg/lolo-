/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';

// ============================================================================
// MARK: - Constants & Configuration
// ============================================================================

/**
 * Path to the self-contained Lofi Code Radio HTML asset in the public directory.
 * Renders the animated visual room scene, canvas elements, and audio player.
 */
const EMBEDDED_RADIO_ASSET_PATH: string = '/assets/aistudio/Lofi_Code_Radio_6974a97c.html';

// ============================================================================
// MARK: - Main Application Component
// ============================================================================

/**
 * Root component that renders the Lofi Code Radio application in full viewport.
 * Includes embedded audio player scene and attribution link to Chillify.
 */
export default function App(): React.JSX.Element {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1d1a2b] select-none">
      {/* Embedded Lofi Code Radio Frame */}
      <iframe
        id="lofi-radio-main-frame"
        src={EMBEDDED_RADIO_ASSET_PATH}
        className="w-full h-full border-0 absolute inset-0 z-0"
        allow="autoplay; encrypted-media; fullscreen"
        title="Lofi Code Radio"
      />

      {/* 
        MARK: - Attribution Overlay Badge
        Fixed at the bottom-left corner to provide clear credit to Chillify.
      */}
      <div className="fixed bottom-4 left-4 z-40 hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1c162c]/80 backdrop-blur-md border border-white/10 text-xs text-[#cfc4dc] shadow-lg pointer-events-auto">
        <span>Music brought to you by</span>
        <a
          href="https://chillify.me"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#ffb892] font-semibold hover:underline flex items-center gap-1"
        >
          chillify.me <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

