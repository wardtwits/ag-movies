import tmdbLogo from '../assets/tmdb.svg'

export const TmdbFooter = () => {
  return (
    <footer className="tmdb-footer">
      <span>Powered by</span>
      <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
        <img src={tmdbLogo} alt="The Movie Database" />
      </a>
    </footer>
  )
}
