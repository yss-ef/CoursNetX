import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaArrowLeft, FaArrowRight, FaCopy } from 'react-icons/fa';
import { debounce } from 'lodash';
import './CoursesList.css';

const CoursesList = ({ web3, contract, account }) => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 6;
  const searchInputRef = useRef(null);

  const fetchCourses = useCallback(async () => {
    if (!web3 || !contract || !account) {
      setMessage('Veuillez connecter MetaMask');
      toast.error('MetaMask non connecté');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const courseIds = await contract.methods.obtenirListeCours().call();
      const coursesData = [];

      for (const id of courseIds) {
        try {
          const isAuthorized = await contract.methods.estAutorise(id, account).call();
          if (isAuthorized) {
            const details = await contract.methods.obtenirCours(id).call({ from: account });
            coursesData.push({
              id,
              title: details[0],
              ipfsHash: details[1],
              teacherName: details[2],
              isPublic: details[3],
              filiere: details[4],
              ipfsUrl: `https://gateway.pinata.cloud/ipfs/${details[1]}`,
            });
          }
        } catch (error) {
          console.error(`Erreur lors de la récupération du cours ${id} :`, error);
        }
      }

      setCourses(coursesData);
      setFilteredCourses(coursesData);
      setMessage(coursesData.length > 0 ? '' : 'Aucun cours accessible');
    } catch (error) {
      setMessage(`Erreur : ${error.message}`);
      toast.error('Erreur lors du chargement des cours');
    } finally {
      setIsLoading(false);
    }
  }, [web3, contract, account]);

  useEffect(() => {
    fetchCourses();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [fetchCourses]);

  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
      const filtered = courses.filter((course) =>
        course.title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCourses(filtered);
      setMessage(filtered.length > 0 ? '' : 'Aucun cours trouvé pour cette recherche');
      setCurrentPage(1);
    }, 300),
    [courses]
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="courses-container">
      <h2 className="courses-title">Liste des cours</h2>
      <div className="message-wrapper">
        <div className={`message-container ${isLoading ? 'visible' : ''}`}>
          <p className="loading-message">Chargement...</p>
        </div>
        <div className={`message-container ${message && !isLoading ? 'visible' : ''}`}>
          <p className="error-message">{message}</p>
        </div>
        <div
          className={`message-container ${
            !message && !filteredCourses.length && !isLoading ? 'visible' : ''
          }`}
        >
          <p className="no-courses-message">Aucun cours disponible.</p>
        </div>
      </div>
      {!isLoading && (
        <>
          <div className="courses-section">
            <div className="search-filter-container">
              <input
                type="text"
                placeholder="Rechercher un cours par titre..."
                onChange={handleSearchChange}
                className="search-input"
                ref={searchInputRef}
                aria-label="Rechercher un cours par titre"
                disabled={isLoading}
              />
            </div>
            <div className="message-wrapper">
              <div
                className={`message-container ${
                  filteredCourses.length === 0 && searchTerm ? 'visible' : ''
                }`}
              >
                <p className="no-courses-message">Aucun cours trouvé pour cette recherche.</p>
              </div>
            </div>
            {filteredCourses.length > 0 && (
              <ul className="courses-list">
                {currentCourses.map((course) => (
                  <li key={course.id} className="course">
                    <a
                      href={course.ipfsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="course-button"
                      aria-label={`Ouvrir le cours ${course.title}`}
                    >
                      <div className="course-details">
                        <span className="course-title">{course.title}</span>
                        <p>
                          <strong>ID :</strong> {course.id}
                        </p>
                        <p>
                          <strong>Public :</strong> {course.isPublic ? 'Oui' : 'Non'}
                        </p>
                        <p>
                          <strong>Enseignant :</strong> {course.teacherName}
                        </p>
                        <p>
                          <strong>Filière :</strong> {course.filiere}
                        </p>
                        <p className="copyable-field">
                          <strong>Hachage IPFS :</strong>{' '}
                          <span>
                            {course.ipfsHash.slice(0, 10)}...{course.ipfsHash.slice(-10)}
                            <button
                              onClick={(e) => {
                                e.preventDefault(); // Prevent link navigation
                                navigator.clipboard
                                  .writeText(course.ipfsHash)
                                  .then(() => toast.info('Hachage IPFS copié dans le presse-papiers'));
                              }}
                              className="copy-button"
                              aria-label="Copier le hachage IPFS"
                            >
                              <FaCopy />
                            </button>
                          </span>
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="pagination-button"
                  disabled={currentPage === 1 || isLoading}
                  aria-label="Page précédente"
                >
                  <FaArrowLeft />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                    aria-label={`Aller à la page ${page}`}
                    disabled={isLoading}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="pagination-button"
                  disabled={currentPage === totalPages || isLoading}
                  aria-label="Page suivante"
                >
                  <FaArrowRight />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CoursesList;