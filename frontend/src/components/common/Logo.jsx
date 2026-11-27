// The two Sparkility logo files (frontend/public/brand):
// light version = navy head, for light backgrounds; dark version = white head, for dark backgrounds.
const LOGO_LIGHT = '/brand/sparkility-logo-light.svg';
const LOGO_DARK = '/brand/sparkility-logo-dark.svg';

/**
 * Sparkility logo: the runner with the spark + the name.
 * <Logo />       follows light / dark mode (a printed bill always gets the light version)
 * <Logo light /> always the dark-background version (the dark sidebar)
 */
export default function Logo({ light = false, compact = false }) {
  const imageClass = 'h-11 w-11 shrink-0';
  return (
    <div className="flex items-center gap-2">
      {light ? (
        <img src={LOGO_DARK} alt={compact ? 'Sparkility' : ''} width="44" height="44" className={imageClass} />
      ) : (
        <>
          {/* Only one of the two shows: see .logo-for-light / .logo-for-dark in index.css */}
          <img src={LOGO_LIGHT} alt={compact ? 'Sparkility' : ''} width="44" height="44" className={`logo-for-light ${imageClass}`} />
          <img src={LOGO_DARK} alt="" width="44" height="44" className={`logo-for-dark ${imageClass}`} />
        </>
      )}
      {!compact && (
        <span className={`font-display text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-sand-900'}`}>
          Sparkility
        </span>
      )}
    </div>
  );
}
