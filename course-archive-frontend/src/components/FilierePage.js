import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';
import { FaArrowLeft, FaArrowRight, FaCopy } from 'react-icons/fa';
import './FilierePage.css';

const FilierePage = ({ web3, contract, account }) => {
  const [filieres, setFilieres] = useState([]);
  const [filteredFilieres, setFilteredFilieres] = useState([]);
  const [selectedFiliere, setSelectedFiliere] = useState('');
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filiereSearchTerm, setFiliereSearchTerm] = useState('');
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [filiereCurrentPage, setFiliereCurrentPage] = useState(1);
  const [courseCurrentPage, setCourseCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const filiereSearchInputRef = useRef(null);
  const courseSearchInputRef = useRef(null);

  const fetchFilieres = useCallback(async () => {
    if (!web3 || !contract || !account) {
      setMessage('Veuillez connecter MetaMask');
      toast.error('MetaMask non connecté');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const filiereList = await contract.methods.obtenirFilieres().call();
      const filteredFiliereList = filiereList.filter(f => f !== '');
      setFilieres(filteredFiliereList);
      setFilteredFilieres(filteredFiliereList);
      setMessage(filteredFiliereList.length > 0 ? '' : 'Aucune filière disponible');
    } catch (error) {
      setMessage(`Erreur : ${error.message}`);
      toast.error('Erreur lors du chargement des filières');
      console.error('Fetch Filieres Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [web3, contract, account]);

  const fetchCoursesByFiliere = useCallback(async (filiere) => {
    if (!web3 || !contract || !account || !filiere) {
      setMessage('Veuillez sélectionner une filière');
      toast.error('Aucune filière sélectionnée');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setCourseSearchTerm('');
    setCourseCurrentPage(1);

    try {
      const courseIds = await contract.methods.obtenirCoursParFiliere(filiere).call();
      const coursesByFiliere = [];
      for (const id of courseIds) {
        try {
          const isCourseAuthorized = await contract.methods.estAutorise(id, account).call();
          if (isCourseAuthorized) {
            const details = await contract.methods.obtenirCours(id).call({ from: account });
            coursesByFiliere.push({
              id: id,
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

      setCourses(coursesByFiliere);
      setFilteredCourses(coursesByFiliere);
      setMessage(coursesByFiliere.length > 0 ? '' : 'Aucun cours trouvé pour cette filière');
    } catch (error) {
      setMessage(`Erreur : ${error.message}`);
      toast.error('Erreur lors du chargement des cours');
      console.error('Fetch Courses Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [web3, contract, account]);

  useEffect(() => {
    fetchFilieres();
  }, [fetchFilieres]);

  const debouncedFiliereSearch = useCallback(
    debounce((value) => {
      setFiliereSearchTerm(value);
      const filtered = filieres.filter((filiere) =>
        filiere.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredFilieres(filtered);
      setMessage(filtered.length > 0 ? '' : value ? 'Aucune filière trouvée pour cette recherche' : 'Aucune filière disponible');
      setFiliereCurrentPage(1);
    }, 300),
    [filieres]
  );

  const debouncedCourseSearch = useCallback(
    debounce((value) => {
      setCourseSearchTerm(value);
      const filtered = courses.filter((course) =>
        course.title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCourses(filtered);
      setMessage(filtered.length > 0 ? '' : value ? 'Aucun cours trouvé pour cette recherche' : 'Aucun cours trouvé pour cette filière');
      setCourseCurrentPage(1);
    }, 300),
    [courses]
  );

  const handleFiliereSearchChange = (e) => {
    debouncedFiliereSearch(e.target.value);
  };

  const handleCourseSearchChange = (e) => {
    debouncedCourseSearch(e.target.value);
  };

  const handleFiliereSelect = (filiere) => {
    setSelectedFiliere(filiere);
    fetchCoursesByFiliere(filiere);
    setFiliereSearchTerm('');
    setFilteredFilieres(filieres);
    setFiliereCurrentPage(1);
    if (courseSearchInputRef.current) {
      courseSearchInputRef.current.focus();
    }
  };

  const handleBack = () => {
    setSelectedFiliere('');
    setCourses([]);
    setFilteredCourses([]);
    setCourseSearchTerm('');
    setMessage('');
    setCourseCurrentPage(1);
    if (filiereSearchInputRef.current) {
      filiereSearchInputRef.current.focus();
    }
  };

  const filiereIndexOfLastItem = filiereCurrentPage * itemsPerPage;
  const filiereIndexOfFirstItem = filiereIndexOfLastItem - itemsPerPage;
  const currentFilieres = filteredFilieres.slice(filiereIndexOfFirstItem, filiereIndexOfLastItem);
  const filiereTotalPages = Math.ceil(filteredFilieres.length / itemsPerPage);

  const courseIndexOfLastItem = courseCurrentPage * itemsPerPage;
  const courseIndexOfFirstItem = courseIndexOfLastItem - itemsPerPage;
  const currentCourses = filteredCourses.slice(courseIndexOfFirstItem, courseIndexOfLastItem);
  const courseTotalPages = Math.ceil(filteredCourses.length / itemsPerPage);

  const handleFilierePageChange = (page) => {
    setFiliereCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCoursePageChange = (page) => {
    setCourseCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="courses-container">
      <h2 className="courses-title">
        {selectedFiliere ? `Cours pour ${selectedFiliere}` : 'Filières et Cours'}
      </h2>
      <div className="message-wrapper">
        <div className={`message-container ${isLoading ? 'visible' : ''}`}>
          <p className="loading-message">Chargement...</p>
        </div>
        <div className={`message-container ${message && !isLoading ? 'visible' : ''}`}>
          <p className="error-message">{message}</p>
        </div>
      </div>
      {!isLoading && (
        <>
          {!selectedFiliere && (
            <div className="courses-section">
              <div className="search-filter-container">
                <input
                  type="text"
                  placeholder="Rechercher une filière par nom..."
                  onChange={handleFiliereSearchChange}
                  className="search-input"
                  ref={filiereSearchInputRef}
                  aria-label="Rechercher une filière par nom"
                  disabled={isLoading}
                />
              </div>
              <h3 className="section-title">Sélectionner une filière</h3>
              <div className="message-wrapper">
                <div
                  className={`message-container ${
                    filteredFilieres.length === 0 && filiereSearchTerm ? 'visible' : ''
                  }`}
                >
                  <p className="no-filiere-message">Aucune filière trouvée pour cette recherche.</p>
                </div>
              </div>
              {filteredFilieres.length > 0 && (
                <>
                  <ul className="courses-list filiere-list">
                    {currentFilieres.map((filiere, index) => (
                      <li
                        key={index}
                        className={`course-item ${selectedFiliere === filiere ? 'selected' : ''}`}
                        onClick={() => handleFiliereSelect(filiere)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Sélectionner la filière ${filiere}`}
                        onKeyPress={(e) => e.key === 'Enter' && handleFiliereSelect(filiere)}
                      >
                        <div>
                          <span className="course-title">{filiere}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {filiereTotalPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => handleFilierePageChange(filiereCurrentPage - 1)}
                        className="pagination-button"
                        disabled={filiereCurrentPage === 1 || isLoading}
                        aria-label="Page précédente"
                      >
                        <FaArrowLeft />
                      </button>
                      {Array.from({ length: filiereTotalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handleFilierePageChange(page)}
                          className={`pagination-button ${filiereCurrentPage === page ? 'active' : ''}`}
                          aria-label={`Aller à la page ${page}`}
                          disabled={isLoading}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => handleFilierePageChange(filiereCurrentPage + 1)}
                        className="pagination-button"
                        disabled={filiereCurrentPage === filiereTotalPages || isLoading}
                        aria-label="Page suivante"
                      >
                        <FaArrowRight />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {selectedFiliere && (
            <div className="courses-section">
              <button
                onClick={handleBack}
                className="back-button"
                disabled={isLoading}
              >
                ← Retour
              </button>
              <div className="search-filter-container">
                <input
                  type="text"
                  placeholder="Rechercher un cours par titre..."
                  onChange={handleCourseSearchChange}
                  className="search-input"
                  ref={courseSearchInputRef}
                  aria-label="Rechercher un cours par titre dans la filière sélectionnée"
                  disabled={isLoading}
                />
              </div>
              <div className="message-wrapper">
                <div
                  className={`message-container ${filteredCourses.length === 0 ? 'visible' : ''}`}
                >
                  <p className="no-courses-message">
                    {courseSearchTerm
                      ? 'Aucun cours trouvé pour cette recherche.'
                      : 'Aucun cours trouvé pour cette filière.'}
                  </p>
                </div>
              </div>
              {filteredCourses.length > 0 && (
                <>
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
                            <p className="copyable-field">
                              <strong>Hachage IPFS :</strong>{' '}
                              <span>
                                {course.ipfsHash.slice(0, 10)}...{course.ipfsHash.slice(-10)}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
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
                  {courseTotalPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => handleCoursePageChange(courseCurrentPage - 1)}
                        className="pagination-button"
                        disabled={courseCurrentPage === 1 || isLoading}
                        aria-label="Page précédente"
                      >
                        <FaArrowLeft />
                      </button>
                      {Array.from({ length: courseTotalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handleCoursePageChange(page)}
                          className={`pagination-button ${courseCurrentPage === page ? 'active' : ''}`}
                          aria-label={`Aller à la page ${page}`}
                          disabled={isLoading}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => handleCoursePageChange(courseCurrentPage + 1)}
                        className="pagination-button"
                        disabled={courseCurrentPage === courseTotalPages || isLoading}
                        aria-label="Page suivante"
                      >
                        <FaArrowRight />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FilierePage;