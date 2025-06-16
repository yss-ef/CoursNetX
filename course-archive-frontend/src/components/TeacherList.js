import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaArrowLeft, FaArrowRight, FaCopy } from 'react-icons/fa';
import { debounce } from 'lodash';
import './TeacherList.css';

const TeacherList = ({ web3, contract, account }) => {
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
  const [courseCurrentPage, setCourseCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const teacherSearchInputRef = useRef(null);
  const courseSearchInputRef = useRef(null);

  const fetchTeachers = useCallback(async () => {
    if (!web3 || !contract || !account) {
      setMessage('Veuillez connecter MetaMask');
      toast.error('MetaMask non connecté');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const teacherAddresses = await contract.methods.obtenirListeEnseignants().call();
      const teachersData = [];

      for (const address of teacherAddresses) {
        try {
          const name = await contract.methods.obtenirNomUtilisateur(address).call();
          if (name) {
            teachersData.push({
              address,
              name,
            });
          }
        } catch (error) {
          console.error(`Erreur lors de la récupération du nom pour ${address} :`, error);
        }
      }

      setTeachers(teachersData);
      setFilteredTeachers(teachersData);
      setMessage(teachersData.length > 0 ? '' : 'Aucun enseignant trouvé');
    } catch (error) {
      setMessage(`Erreur : ${error.message}`);
      toast.error('Erreur lors du chargement des enseignants');
    } finally {
      setIsLoading(false);
    }
  }, [web3, contract, account]);

  const fetchTeacherCourses = useCallback(
    async (teacherAddress) => {
      if (!web3 || !contract || !account || !teacherAddress) {
        setMessage('Veuillez sélectionner un enseignant');
        toast.error('Aucun enseignant sélectionné');
        return;
      }

      setIsLoading(true);
      setMessage('');
      setCourseSearchTerm('');
      setCourseCurrentPage(1);

      try {
        const role = await contract.methods.rolesUtilisateurs(account).call();
        const isTeacher =
          Number(role) === 1 && account.toLowerCase() === teacherAddress.toLowerCase();

        const courseIds = await contract.methods.obtenirListeCours().call();
        const teacherCourses = [];
        for (const id of courseIds) {
          try {
            const ownerAddress = await contract.methods.coursProprietaireAddress(id).call();
            if (ownerAddress.toLowerCase() === teacherAddress.toLowerCase()) {
              const isCourseAuthorized = await contract.methods.estAutorise(id, account).call();
              if (isCourseAuthorized || isTeacher) {
                const details = await contract.methods.obtenirCours(id).call({ from: account });
                teacherCourses.push({
                  id: id,
                  title: details[0],
                  ipfsHash: details[1],
                  teacherName: details[2],
                  isPublic: details[3],
                  filiere: details[4],
                  ipfsUrl: `https://gateway.pinata.cloud/ipfs/${details[1]}`,
                });
              }
            }
          } catch (error) {
            console.error(`Erreur lors de la récupération du cours ${id} :`, error);
          }
        }

        setCourses(teacherCourses);
        setFilteredCourses(teacherCourses);
        setMessage(teacherCourses.length > 0 ? '' : 'Aucun cours trouvé pour cet enseignant');
      } catch (error) {
        setMessage(`Erreur : ${error.message}`);
        toast.error('Erreur lors du chargement des cours');
      } finally {
        setIsLoading(false);
      }
    },
    [web3, contract, account]
  );

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const debouncedTeacherSearch = useCallback(
    debounce((value) => {
      setTeacherSearchTerm(value);
      const filtered = teachers.filter((teacher) =>
        teacher.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredTeachers(filtered);
      setMessage(filtered.length > 0 ? '' : value ? 'Aucun enseignant trouvé pour cette recherche' : 'Aucun enseignant trouvé');
      setTeacherCurrentPage(1);
    }, 300),
    [teachers]
  );

  const debouncedCourseSearch = useCallback(
    debounce((value) => {
      setCourseSearchTerm(value);
      const filtered = courses.filter((course) =>
        course.title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCourses(filtered);
      setMessage(filtered.length > 0 ? '' : value ? 'Aucun cours trouvé pour cette recherche' : 'Aucun cours trouvé pour cet enseignant');
      setCourseCurrentPage(1);
    }, 300),
    [courses]
  );

  const handleTeacherSearchChange = (e) => {
    debouncedTeacherSearch(e.target.value);
  };

  const handleCourseSearchChange = (e) => {
    debouncedCourseSearch(e.target.value);
  };

  const handleTeacherSelect = (teacher) => {
    setSelectedTeacher(teacher);
    fetchTeacherCourses(teacher.address);
    setTeacherSearchTerm('');
    setFilteredTeachers(teachers);
    setTeacherCurrentPage(1);
    if (courseSearchInputRef.current) {
      courseSearchInputRef.current.focus();
    }
  };

  const handleBack = () => {
    setSelectedTeacher(null);
    setCourses([]);
    setFilteredCourses([]);
    setCourseSearchTerm('');
    setMessage('');
    setCourseCurrentPage(1);
    if (teacherSearchInputRef.current) {
      teacherSearchInputRef.current.focus();
    }
  };

  const teacherIndexOfLastItem = teacherCurrentPage * itemsPerPage;
  const teacherIndexOfFirstItem = teacherIndexOfLastItem - itemsPerPage;
  const currentTeachers = filteredTeachers.slice(teacherIndexOfFirstItem, teacherIndexOfLastItem);
  const teacherTotalPages = Math.ceil(filteredTeachers.length / itemsPerPage);

  const courseIndexOfLastItem = courseCurrentPage * itemsPerPage;
  const courseIndexOfFirstItem = courseIndexOfLastItem - itemsPerPage;
  const currentCourses = filteredCourses.slice(courseIndexOfFirstItem, courseIndexOfLastItem);
  const courseTotalPages = Math.ceil(filteredCourses.length / itemsPerPage);

  const handleTeacherPageChange = (page) => {
    setTeacherCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCoursePageChange = (page) => {
    setCourseCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="courses-container">
      <h2 className="courses-title">
        {selectedTeacher ? `Cours de ${selectedTeacher.name}` : 'Enseignants et Cours'}
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
          {!selectedTeacher && (
            <div className="courses-section">
              <div className="search-filter-container">
                <input
                  type="text"
                  placeholder="Rechercher un enseignant par nom..."
                  onChange={handleTeacherSearchChange}
                  className="search-input"
                  ref={teacherSearchInputRef}
                  aria-label="Rechercher un enseignant par nom"
                  disabled={isLoading}
                />
              </div>
              <h3 className="section-title">Sélectionner un enseignant</h3>
              <div className="message-wrapper">
                <div
                  className={`message-container ${
                    filteredTeachers.length === 0 && teacherSearchTerm ? 'visible' : ''
                  }`}
                >
                  <p className="no-filiere-message">Aucun enseignant trouvé pour cette recherche.</p>
                </div>
              </div>
              {filteredTeachers.length > 0 && (
                <>
                  <ul className="courses-list filiere-list">
                    {currentTeachers.map((teacher) => (
                      <li
                        key={teacher.address}
                        className={`course-item ${selectedTeacher?.address === teacher.address ? 'selected' : ''}`}
                        onClick={() => handleTeacherSelect(teacher)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Sélectionner l'enseignant ${teacher.name}`}
                        onKeyPress={(e) => e.key === 'Enter' && handleTeacherSelect(teacher)}
                      >
                        <div>
                          <span className="course-title">{teacher.name}</span>
                          <p className="course-filiere">
                            Adresse: {teacher.address.slice(0, 6)}...{teacher.address.slice(-4)}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard
                                  .writeText(teacher.address)
                                  .then(() => toast.info('Adresse copiée dans le presse-papiers'));
                              }}
                              className="copy-button"
                              aria-label="Copier l'adresse de l'enseignant"
                            >
                              <FaCopy />
                            </button>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {teacherTotalPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => handleTeacherPageChange(teacherCurrentPage - 1)}
                        className="pagination-button"
                        disabled={teacherCurrentPage === 1 || isLoading}
                        aria-label="Page précédente"
                      >
                        <FaArrowLeft />
                      </button>
                      {Array.from({ length: teacherTotalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handleTeacherPageChange(page)}
                          className={`pagination-button ${teacherCurrentPage === page ? 'active' : ''}`}
                          aria-label={`Aller à la page ${page}`}
                          disabled={isLoading}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => handleTeacherPageChange(teacherCurrentPage + 1)}
                        className="pagination-button"
                        disabled={teacherCurrentPage === teacherTotalPages || isLoading}
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
          {selectedTeacher && (
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
                  aria-label="Rechercher un cours par titre pour l'enseignant sélectionné"
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
                      : 'Aucun cours trouvé pour cet enseignant.'}
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
                              <strong>Filière :</strong> {course.filiere}
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

export default TeacherList;