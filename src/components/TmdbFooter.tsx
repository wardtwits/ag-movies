import tmdbLogo from '../assets/tmdb.svg'

export const TmdbFooter = () => {
  return (
    <footer className="tmdb-footer">
      <div className="tmdb-footer-brand">
        <span>Powered by</span>
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
          <img src={tmdbLogo} alt="The Movie Database" />
        </a>
      </div>
      <p className="tmdb-footer-disclaimer">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </footer>
  )
}
