'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Disc3,
  Expand,
  FileArchive,
  FolderOpen,
  Gamepad2,
  Hand,
  HardDrive,
  LoaderCircle,
  Minimize2,
  MousePointer2,
  Play,
  RotateCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  clearCdLibrary,
  type CdLibraryMetadata,
  formatBytes,
  getCdLibraryMetadata,
  importCdFolder,
  importCdZip,
} from '@/lib/cd-library';

const DEMO_PLAYER_URL =
  '/player.html?build=15-chunked-storage&edition=demo#--config=/goblins3-web.ini --music-driver=adlib --path=/games/gob3-dos-demo-en gob:gob3';
const CD_PLAYER_URL =
  '/player.html?build=15-chunked-storage&edition=cd#--config=/goblins3-web.ini --music-driver=adlib --path=/games/gob3-cd gob:gob3';

type Edition = 'demo' | 'cd';

type PlayerMessage = {
  source?: string;
  type?: 'ready' | 'status' | 'toggle-fullscreen';
  text?: string;
};

export default function Home() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const cabinetRef = useRef<HTMLDivElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const expandedRef = useRef(false);
  const nativeFullscreenRef = useRef(false);
  const [edition, setEdition] = useState<Edition>('demo');
  const [playerVersion, setPlayerVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState('Preparing the ScummVM engine…');
  const [library, setLibrary] = useState<CdLibraryMetadata | null>(null);
  const [libraryChecked, setLibraryChecked] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [importError, setImportError] = useState('');

  const playerUrl = edition === 'cd' ? CD_PLAYER_URL : DEMO_PLAYER_URL;

  const launchEdition = useCallback((nextEdition: Edition) => {
    setEdition(nextEdition);
    setReady(false);
    setStatus(
      nextEdition === 'cd'
        ? 'Preparing your local CD edition…'
        : 'Preparing the official DOS demo…',
    );
    setPlayerVersion((version) => version + 1);
  }, []);

  const handleImport = useCallback(
    async (kind: 'zip' | 'folder', files: FileList | null) => {
      const firstFile = files?.[0];
      if (!files?.length || !firstFile) return;

      setImporting(true);
      setImportError('');
      setImportProgress(1);
      setImportStatus(
        kind === 'zip' ? 'Opening CD archive…' : 'Reading CD folder…',
      );

      try {
        const onProgress = ({
          percent,
          detail,
        }: {
          percent: number;
          detail: string;
        }) => {
          setImportProgress(percent);
          setImportStatus(detail);
        };
        const metadata =
          kind === 'zip'
            ? await importCdZip(firstFile, {
                sourceName: firstFile.name,
                onProgress,
              })
            : await importCdFolder(files, {
                sourceName:
                  (
                    firstFile as File & { webkitRelativePath?: string }
                  ).webkitRelativePath?.split('/')[0] || 'Selected CD folder',
                onProgress,
              });

        setLibrary(metadata);
        setImportProgress(100);
        setImportStatus(`${metadata.release} saved on this device.`);
        launchEdition('cd');
      } catch (error) {
        setImportError(error instanceof Error ? error.message : String(error));
        setImportStatus('');
        setImportProgress(0);
      } finally {
        setImporting(false);
        if (zipInputRef.current) zipInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
      }
    },
    [launchEdition],
  );

  const removeLibrary = useCallback(async () => {
    setImporting(true);
    setImportError('');
    setImportStatus('Removing the local CD copy…');
    try {
      await clearCdLibrary();
      setLibrary(null);
      setImportStatus('Local CD files removed.');
      launchEdition('demo');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    } finally {
      setImporting(false);
    }
  }, [launchEdition]);

  useEffect(() => {
    let cancelled = false;
    getCdLibraryMetadata()
      .then((metadata) => {
        if (cancelled) return;
        setLibrary(metadata);
        if (metadata) {
          setEdition('cd');
          setStatus('Preparing your local CD edition…');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setImportError(
            error instanceof Error
              ? error.message
              : 'Could not check local CD storage.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLibraryChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const syncPlayerDisplayMode = useCallback(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    document.documentElement.classList.toggle('standalone-app', standalone);
    frameRef.current?.contentWindow?.postMessage(
      { source: 'goblins3-shell', type: 'display-mode', standalone },
      window.location.origin,
    );
  }, []);

  const toggleFullscreen = useCallback(async (tryNativeFullscreen: boolean) => {
    const next = !expandedRef.current;
    expandedRef.current = next;
    setExpanded(next);

    if (!next) {
      nativeFullscreenRef.current = false;
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      return;
    }

    window.scrollTo(0, 0);
    if (tryNativeFullscreen && cabinetRef.current?.requestFullscreen) {
      try {
        await cabinetRef.current.requestFullscreen();
        nativeFullscreenRef.current = true;
      } catch {
        nativeFullscreenRef.current = false;
      }
    }

    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (value: OrientationLockType) => Promise<void>;
    };
    await orientation.lock?.('landscape').catch(() => {});
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent<PlayerMessage>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== 'goblins3-player') return;

      if (event.data.type === 'ready') {
        setReady(true);
        setStatus(
          event.data.text ||
            (edition === 'cd' ? 'CD edition ready' : 'Demo ready'),
        );
        syncPlayerDisplayMode();
      } else if (event.data.type === 'status' && event.data.text) {
        setStatus(event.data.text);
      } else if (event.data.type === 'toggle-fullscreen') {
        void toggleFullscreen(false);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [edition, syncPlayerDisplayMode, toggleFullscreen]);

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    syncPlayerDisplayMode();
    displayMode.addEventListener('change', syncPlayerDisplayMode);
    return () => {
      displayMode.removeEventListener('change', syncPlayerDisplayMode);
      document.documentElement.classList.remove('standalone-app');
    };
  }, [syncPlayerDisplayMode]);

  useEffect(() => {
    document.documentElement.classList.toggle('game-expanded', expanded);
    document.body.classList.toggle('game-expanded', expanded);
    frameRef.current?.contentWindow?.postMessage(
      { source: 'goblins3-shell', type: 'fullscreen-state', expanded },
      window.location.origin,
    );

    return () => {
      document.documentElement.classList.remove('game-expanded');
      document.body.classList.remove('game-expanded');
    };
  }, [expanded]);

  useEffect(() => {
    const timers = new Set<number>();

    const syncViewport = () => {
      const viewport = window.visualViewport;
      const width = Math.round(viewport?.width ?? window.innerWidth);
      const height = Math.round(viewport?.height ?? window.innerHeight);
      const root = document.documentElement;

      root.style.setProperty('--visible-width', `${width}px`);
      root.style.setProperty('--visible-height', `${height}px`);

      if (
        window.matchMedia('(orientation: landscape)').matches ||
        expandedRef.current
      ) {
        window.scrollTo(0, 0);
      }

      frameRef.current?.contentWindow?.postMessage(
        { source: 'goblins3-shell', type: 'viewport-change' },
        window.location.origin,
      );
    };

    const settleViewport = () => {
      for (const delay of [0, 120, 360, 760]) {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          syncViewport();
        }, delay);
        timers.add(timer);
      }
    };

    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        nativeFullscreenRef.current = true;
        if (!expandedRef.current) {
          expandedRef.current = true;
          setExpanded(true);
        }
      } else {
        nativeFullscreenRef.current = false;
      }
      settleViewport();
    };

    settleViewport();
    window.addEventListener('orientationchange', settleViewport);
    window.addEventListener('resize', settleViewport);
    window.visualViewport?.addEventListener('resize', settleViewport);
    window.visualViewport?.addEventListener('scroll', settleViewport);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      window.removeEventListener('orientationchange', settleViewport);
      window.removeEventListener('resize', settleViewport);
      window.visualViewport?.removeEventListener('resize', settleViewport);
      window.visualViewport?.removeEventListener('scroll', settleViewport);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  return (
    <main className="min-h-svh overflow-x-hidden bg-background text-foreground">
      <div className="scanlines" aria-hidden="true" />

      <header className="relative z-20 flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 lg:px-8">
        <a href="#game" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-sm border border-amber-300/30 bg-amber-300/10 text-amber-200">
            <Gamepad2 className="size-4" />
          </span>
          <span className="font-display text-sm tracking-[0.22em] text-amber-50 sm:text-base">
            GOBLINS 3 <em className="not-italic text-amber-300">WEB</em>
          </span>
        </a>
        <Badge
          variant="outline"
          className="border-emerald-300/25 bg-emerald-400/10 text-[10px] uppercase tracking-[0.14em] text-emerald-200"
        >
          <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_9px_rgba(110,231,183,.9)]" />
          {library ? 'CD edition ready' : 'Real DOS demo'}
        </Badge>
      </header>

      <section
        id="game"
        className="relative z-10 mx-auto w-full max-w-[1480px] px-3 pb-10 pt-5 sm:px-6 lg:px-8"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">
              Coktel Vision · 1993 ·{' '}
              {edition === 'cd' ? 'DOS CD edition' : 'English demo'}
            </p>
            <h1 className="font-display mt-1 text-[clamp(1.6rem,5vw,3.7rem)] leading-none tracking-[-0.04em] text-[#fff7d7]">
              Goblins Quest 3
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span
              className={`size-2 rounded-full ${ready ? 'bg-emerald-300' : 'animate-pulse bg-amber-300'}`}
              aria-hidden="true"
            />
            <span aria-live="polite">{status}</span>
          </div>
        </div>

        <section className="cd-library" aria-labelledby="cd-library-title">
          <div className="cd-library-copy">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid size-9 place-items-center rounded-md border border-amber-300/25 bg-amber-300/10 text-amber-200">
                <Disc3 className="size-4" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="cd-library-title"
                    className="text-sm font-semibold text-stone-100"
                  >
                    Full DOS CD edition
                  </h2>
                  <Badge className="bg-amber-300/12 text-[9px] uppercase tracking-[0.12em] text-amber-200">
                    Priority build
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-stone-500">
                  Your legally owned files stay in this browser and are never
                  uploaded.
                </p>
              </div>
            </div>

            {library ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-200/85">
                <span className="inline-flex items-center gap-1.5">
                  <HardDrive className="size-3.5" />
                  {library.release}
                </span>
                <span>{library.fileCount} files</span>
                <span>{formatBytes(library.totalBytes)} stored locally</span>
              </div>
            ) : (
              <p className="mt-3 max-w-2xl text-xs leading-5 text-stone-400">
                On iPhone, choose a ZIP containing the extracted Goblins 3 CD
                game folder. On desktop, you can choose the extracted folder
                directly. A GOG installer by itself is not the game folder.
              </p>
            )}

            {(importStatus || importError) && (
              <div className="mt-3" aria-live="polite">
                <p
                  className={`text-xs ${importError ? 'text-red-300' : 'text-stone-300'}`}
                >
                  {importError || importStatus}
                </p>
                {importing && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-amber-300 transition-[width] duration-200"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="cd-library-actions">
            <input
              ref={zipInputRef}
              className="sr-only"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={(event) =>
                void handleImport('zip', event.currentTarget.files)
              }
            />
            <input
              ref={(element) => {
                folderInputRef.current = element;
                element?.setAttribute('webkitdirectory', '');
                element?.setAttribute('directory', '');
              }}
              className="sr-only"
              type="file"
              multiple
              onChange={(event) =>
                void handleImport('folder', event.currentTarget.files)
              }
            />

            {library && (
              <Button
                type="button"
                onClick={() => launchEdition('cd')}
                disabled={importing || (edition === 'cd' && ready)}
                className="bg-amber-300 text-stone-950 hover:bg-amber-200"
              >
                <Play className="size-4 fill-current" />
                {edition === 'cd'
                  ? ready
                    ? 'CD playing'
                    : 'Start CD edition'
                  : 'Play CD edition'}
              </Button>
            )}
            <Button
              type="button"
              variant={library ? 'outline' : 'default'}
              onClick={() => zipInputRef.current?.click()}
              disabled={importing}
              className={
                library
                  ? 'border-white/15 bg-white/5 text-stone-100 hover:bg-white/10'
                  : 'bg-amber-300 text-stone-950 hover:bg-amber-200'
              }
            >
              {importing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FileArchive className="size-4" />
              )}
              {library ? 'Replace from ZIP' : 'Import CD ZIP'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => folderInputRef.current?.click()}
              disabled={importing}
              className="border-white/15 bg-white/5 text-stone-100 hover:bg-white/10"
            >
              <FolderOpen className="size-4" />
              Choose folder
            </Button>
            {library && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void removeLibrary()}
                disabled={importing}
                className="text-stone-500 hover:bg-red-400/10 hover:text-red-200"
                aria-label="Remove CD files from this browser"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </section>

        <div className="edition-switch" aria-label="Choose game edition">
          <button
            type="button"
            className={edition === 'cd' ? 'is-active' : ''}
            disabled={!library || importing}
            onClick={() => launchEdition('cd')}
          >
            <Disc3 className="size-3.5" /> Full CD edition
          </button>
          <button
            type="button"
            className={edition === 'demo' ? 'is-active' : ''}
            disabled={importing}
            onClick={() => launchEdition('demo')}
          >
            <Gamepad2 className="size-3.5" /> Official demo
          </button>
        </div>

        <div
          ref={cabinetRef}
          className={`cabinet-shell ${expanded ? 'is-expanded' : ''}`}
        >
          <div className="cabinet-bar">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 rounded-full bg-[#ff6b35]" />
              <span className="size-2 rounded-full bg-amber-300" />
              <span className="size-2 rounded-full bg-emerald-300" />
              <span className="ml-2 truncate text-[10px] uppercase tracking-[0.18em] text-stone-400">
                ScummVM WebAssembly
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void toggleFullscreen(true)}
              className="h-7 text-[11px] text-stone-300 hover:bg-white/10 hover:text-white"
              aria-label="Open game fullscreen"
            >
              {expanded ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Expand className="size-3.5" />
              )}
              {expanded ? 'Exit' : 'Fullscreen'}
            </Button>
          </div>

          <div className="game-frame-wrap">
            {!ready && (
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[#080707]/72 backdrop-blur-[2px]">
                <div className="max-w-xs px-6 text-center">
                  <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full border border-amber-300/25 bg-amber-300/10">
                    <Gamepad2 className="size-6 animate-pulse text-amber-200" />
                  </div>
                  <p className="font-display text-lg tracking-wide text-amber-50">
                    Waking the goblins…
                  </p>
                  <p className="mt-2 text-xs leading-5 text-stone-400">
                    {status}
                  </p>
                </div>
              </div>
            )}
            {libraryChecked && (
              <iframe
                key={`${edition}-${playerVersion}`}
                ref={frameRef}
                title={`Playable Goblins Quest 3 ${edition === 'cd' ? 'DOS CD edition' : 'DOS demo'}`}
                src={playerUrl}
                allow="autoplay; fullscreen"
                onLoad={syncPlayerDisplayMode}
                className="game-frame"
              />
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ControlCard
            icon={<MousePointer2 />}
            title="Direct mouse touch"
            copy="Tap or drag normally. In wide rooms, tap an edge arrow once for a full camera pan in that direction."
          />
          <ControlCard
            icon={<Hand />}
            title="Inventory / right-click"
            copy="Tap with two fingers. This uses ScummVM’s native right-click path and is the reliable iPhone gesture."
          />
          <ControlCard
            icon={<RotateCw />}
            title="Full-screen landscape"
            copy="Rotate first, then tap Fullscreen. For toolbar-free iPhone play, use Safari’s Add to Home Screen once."
          />
        </div>

        <div className="mt-8 grid gap-5 border-t border-white/10 pt-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-200">
              <ShieldCheck className="size-4 text-emerald-300" />
              Game data &amp; privacy
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-500 sm:text-sm">
              Full-game files are read and stored only by your browser; they are
              never sent to this site. The optional demo is streamed from the
              ScummVM community web-demo mirror, and ScummVM&apos;s official
              catalog publishes that same DOS demo. ScummVM is free software
              under the GPL. Goblins Quest 3 remains the property of its
              respective rights holders.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <a
              href="https://www.gog.com/en/game/gobliiins_pack"
              target="_blank"
              rel="noreferrer"
              className="link"
            >
              Buy the DRM-free collection
            </a>
            <a
              href="https://www.scummvm.org/demos/#gob"
              target="_blank"
              rel="noreferrer"
              className="link"
            >
              Official demo catalog
            </a>
            <a
              href="https://github.com/chkuendig/scummvm-demo/tree/4babbd680a05a724de2ebf20ee317cd53742b9bf"
              target="_blank"
              rel="noreferrer"
              className="link"
            >
              Runtime source
            </a>
            <a
              href="https://www.scummvm.org/"
              target="_blank"
              rel="noreferrer"
              className="link"
            >
              ScummVM
            </a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 flex flex-col gap-2 border-t border-white/10 px-4 py-5 text-[11px] text-stone-600 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>
          An independent preservation experiment — not affiliated with Coktel
          Vision or ScummVM.
        </span>
        <span className="flex items-center gap-1.5">
          <BadgeCheck className="size-3.5 text-emerald-400/70" />
          No uploads. Saves stay in this browser.
        </span>
      </footer>
    </main>
  );
}

function ControlCard({
  icon,
  title,
  copy,
}: {
  icon: React.ReactElement;
  title: string;
  copy: string;
}) {
  return (
    <article className="control-card">
      <span className="control-icon">{icon}</span>
      <div>
        <h2 className="text-sm font-semibold text-stone-100">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-stone-500">{copy}</p>
      </div>
    </article>
  );
}
