import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { FaEdit, FaTrash, FaUserPlus, FaUserMinus } from 'react-icons/fa';
import './MyCoursesPage.css';

const customStyles = {
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? 'var(--primary)' : 'var(--secondary)',
    color: state.isFocused ? 'var(--text-light)' : 'var(--primary)',
    padding: 10,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif"
  }),
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--secondary)',
    borderColor: state.isFocused ? 'var(--accent)' : 'var(--text-dark)',
    boxShadow: state.isFocused ? '0 0 6px rgba(125, 140, 196, 0.3)' : 'none',
    '&:hover': {
      borderColor: 'var(--accent)'
    },
    color: 'var(--text-dark)',
    borderRadius: 8,
    padding: 2,
    fontFamily: "'Inter', sans-serif"
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'var(--secondary)',
    borderRadius: 8,
    boxShadow: '0 4px 12px var(--shadow)',
    fontFamily: "'Inter', sans-serif"
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--text-dark)',
    fontFamily: "'Inter', sans-serif"
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'var(--text-dark)',
    fontFamily: "'Inter', sans-serif"
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: 'var(--primary)'
  }),
  indicatorSeparator: () => ({
    display: 'none'
  })
};

const MyCoursesPage = ({ web3, contract, account }) => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editCourseId, setEditCourseId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', ipfsHash: '', isPublic: false, filiere: null });
  const [editFormErrors, setEditFormErrors] = useState({ title: '', ipfsHash: '', filiere: '' });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [filieres, setFilieres] = useState([]);
  const [authCourseId, setAuthCourseId] = useState(null);
  const [authAddresses, setAuthAddresses] = useState('');
  const [authAddressesError, setAuthAddressesError] = useState('');

  const fetchFilieres = async () => {
    if (!web3 || !contract || !account) {
      toast.error('MetaMask non connecté');
      return;
    }
    try {
      const filiereList = await contract.methods.obtenirFilieres().call();
      const filiereOptions = filiereList
        .filter(f => f !== '')
        .map(f => ({ value: f, label: f }));
      setFilieres(filiereOptions);
    } catch (error) {
      toast.error('Erreur lors du chargement des filières');
      console.error('Fetch Filieres Error:', error);
    }
  };

  const fetchMyCourses = useCallback(async () => {
    if (!web3 || !contract || !account) {
      setMessage('Veuillez connecter MetaMask');
      toast.error('MetaMask non connecté');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const role = await contract.methods.rolesUtilisateurs(account).call();
      const isTeacher = Number(role) === 1;
      const isAdmin = Number(role) === 3;
      setIsAuthorized(isTeacher || isAdmin);

      if (!isTeacher && !isAdmin) {
        setMessage('Accès réservé aux enseignants ou administrateurs');
        toast.error('Accès non autorisé');
        return;
      }

      const courseIds = await contract.methods.obtenirListeCours().call();
      const myCourses = [];
      for (const id of courseIds) {
        try {
          const ownerAddress = await contract.methods.coursProprietaireAddress(id).call();
          if (ownerAddress.toLowerCase() === account.toLowerCase() || isAdmin) {
            const details = await contract.methods.obtenirCours(id).call({ from: account });
            myCourses.push({
              id: id,
              title: details[0],
              ipfsHash: details[1],
              ipfsUrl: `https://gateway.pinata.cloud/ipfs/${details[1]}`,
              isPublic: details[3],
              filiere: details[4],
            });
          }
        } catch (error) {
          console.error(`Erreur lors de la récupération du cours ${id} :`, error);
        }
      }

      setCourses(myCourses);
      setFilteredCourses(myCourses);
      setMessage(myCourses.length > 0 ? '' : 'Aucun cours déposé');
    } catch (error) {
      setMessage(`Erreur : ${error.message}`);
      toast.error('Erreur lors du chargement des cours');
      console.error('Fetch Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [web3, contract, account]);

  useEffect(() => {
    fetchMyCourses();
    fetchFilieres();
  }, [fetchMyCourses]);

  // Filtrer les cours en fonction de la recherche
  useEffect(() => {
    const filtered = courses.filter((course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.filiere.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCourses(filtered);
  }, [searchTerm, courses]);

  const validateEditForm = () => {
    const errors = { title: '', ipfsHash: '', filiere: '' };
    let isValid = true;

    if (!editForm.title.trim()) {
      errors.title = 'Le titre est requis';
      isValid = false;
    } else if (editForm.title.length > 100) {
      errors.title = 'Le titre ne doit pas dépasser 100 caractères';
      isValid = false;
    }

    if (!editForm.ipfsHash.trim()) {
      errors.ipfsHash = 'Le hachage IPFS est requis';
      isValid = false;
    }

    if (!editForm.filiere) {
      errors.filiere = 'La filière est requise';
      isValid = false;
    }

    setEditFormErrors(errors);
    return isValid;
  };

  const validateAuthAddresses = (addresses) => {
    if (!addresses.trim()) {
      setAuthAddressesError('Au moins une adresse est requise');
      return false;
    }
    const addressList = addresses.split(',').map(addr => addr.trim());
    for (const addr of addressList) {
      if (!web3.utils.isAddress(addr)) {
        setAuthAddressesError(`Adresse invalide : ${addr}`);
        return false;
      }
    }
    setAuthAddressesError('');
    return true;
  };

  const handleEditCourse = (course) => {
    if (!isAuthorized) {
      toast.error('Action non autorisée');
      return;
    }
    setEditCourseId(course.id);
    setEditForm({ 
      title: course.title, 
      ipfsHash: course.ipfsHash, 
      isPublic: course.isPublic, 
      filiere: filieres.find(f => f.value === course.filiere) || null 
    });
    setEditFormErrors({ title: '', ipfsHash: '', filiere: '' });
  };

  const handleUpdateCourse = async (courseId) => {
    if (!isAuthorized) {
      toast.error('Action non autorisée');
      return;
    }

    if (!validateEditForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      setIsLoading(true);
      await contract.methods
        .modifierCours(courseId, editForm.title, editForm.ipfsHash, editForm.isPublic, editForm.filiere.value)
        .send({ from: account });
      toast.success('Cours mis à jour avec succès');
      setEditCourseId(null);
      setEditForm({ title: '', ipfsHash: '', isPublic: false, filiere: null });
      setEditFormErrors({ title: '', ipfsHash: '', filiere: '' });
      fetchMyCourses();
    } catch (error) {
      toast.error(`Erreur : ${error.message}`);
      console.error('Update Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!isAuthorized) {
      toast.error('Action non autorisée');
      return;
    }

    if (!window.confirm('Voulez-vous vraiment supprimer ce cours ?')) return;

    try {
      setIsLoading(true);
      await contract.methods.supprimerCours(courseId).send({ from: account });
      toast.success('Cours supprimé avec succès');
      fetchMyCourses();
    } catch (error) {
      toast.error(`Erreur : ${error.message}`);
      console.error('Delete Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageAuth = (courseId) => {
    if (!isAuthorized) {
      toast.error('Action non autorisée');
      return;
    }
    setAuthCourseId(authCourseId === courseId ? null : courseId);
    setAuthAddresses('');
    setAuthAddressesError('');
  };

  const handleAddAuthAddresses = async (courseId) => {
    if (!isAuthorized) {
      toast.error('Action non autorisée');
      return;
    }

    if (!validateAuthAddresses(authAddresses)) {
      toast.error(authAddressesError);
      return;
    }

    const addressList = authAddresses.split(',').map(addr => addr.trim());
    try {
      setIsLoading(true);
      for (const addr of addressList) {
        await contract.methods.ajouterAutorisationCours(courseId, addr).send({ from: account });
      }
      toast.success('Adresses autorisées ajoutées avec succès');
      setAuthAddresses('');
      setAuthAddressesError('');
      setAuthCourseId(null);
    } catch (error) {
      toast.error(`Erreur : ${error.message}`);
      console.error('Add Auth Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAuthAddresses = async (courseId) => {
    if (!isAuthorized) {
      toast.error('Action non autorisée');
      return;
    }

    if (!validateAuthAddresses(authAddresses)) {
      toast.error(authAddressesError);
      return;
    }

    const addressList = authAddresses.split(',').map(addr => addr.trim());
    try {
      setIsLoading(true);
      for (const addr of addressList) {
        await contract.methods.retirerAutorisationCours(courseId, addr).send({ from: account });
      }
      toast.success('Adresses autorisées retirées avec succès');
      setAuthAddresses('');
      setAuthAddressesError('');
      setAuthCourseId(null);
    } catch (error) {
      toast.error(`Erreur : ${error.message}`);
      console.error('Remove Auth Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="courses-container">
      <h2 className="courses-title">Mes Cours</h2>

      {/* Ajout de la barre de recherche */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Rechercher par titre ou filière..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Rechercher des cours"
        />
      </div>

      {isLoading ? (
        <p className="loading-message">Chargement des cours...</p>
      ) : (
        <>
          {message && <p className="error-message">{message}</p>}
          {filteredCourses.length > 0 ? (
            <ul className="courses-list">
              {filteredCourses.map((course) => (
                <li key={course.id} className="course-item">
                  {editCourseId === course.id && isAuthorized ? (
                    <div className="edit-form">
                      <div className="input-group">
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          placeholder="Titre du cours"
                          className={`edit-input ${editFormErrors.title ? 'input-error' : ''}`}
                          aria-label="Modifier le titre du cours"
                        />
                        {editFormErrors.title && (
                          <p className="input-error-message">{editFormErrors.title}</p>
                        )}
                      </div>
                      <div className="input-group">
                        <input
                          type="text"
                          value={editForm.ipfsHash}
                          onChange={(e) => setEditForm({ ...editForm, ipfsHash: e.target.value })}
                          placeholder="Hachage IPFS"
                          className={`edit-input ${editFormErrors.ipfsHash ? 'input-error' : ''}`}
                          readOnly 
                          aria-label="Modifier le hachage IPFS"
                        />
                        {editFormErrors.ipfsHash && (
                          <p className="input-error-message">{editFormErrors.ipfsHash}</p>
                        )}
                      </div>
                      <div className="input-group">
                        <Select
                          value={editForm.filiere}
                          onChange={(option) => setEditForm({ ...editForm, filiere: option })}
                          options={filieres}
                          styles={customStyles}
                          isDisabled={isLoading || filieres.length === 0}
                          placeholder={filieres.length === 0 ? "Aucune filière disponible" : "Sélectionner une filière"}
                          aria-label="Modifier la filière"
                        />
                        {editFormErrors.filiere && (
                          <p className="input-error-message">{editFormErrors.filiere}</p>
                        )}
                      </div>
                      <label className="edit-checkbox">
                        <input
                          type="checkbox"
                          checked={editForm.isPublic}
                          onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                          aria-label="Cours public"
                        />
                        Public
                      </label>
                      <button
                        onClick={() => handleUpdateCourse(course.id)}
                        className="save-button"
                        disabled={isLoading}
                        aria-label="Enregistrer les modifications"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditCourseId(null)}
                        className="cancel-button"
                        aria-label="Annuler"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="course-title">{course.title}</span>
                        <p className="course-filiere">Filière: {course.filiere}</p>
                      </div>
                      <div className="course-actions">
                        <a
                          href={course.ipfsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ipfs-link"
                          aria-label={`Ouvrir le fichier du cours ${course.title}`}
                        >
                          Voir le cours
                        </a>
                        {isAuthorized && (
                          <>
                            <button
                              onClick={() => handleEditCourse(course)}
                              className="action-button"
                              aria-label={`Modifier le cours ${course.title}`}
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="action-button delete"
                              aria-label={`Supprimer le cours ${course.title}`}
                            >
                              <FaTrash />
                            </button>
                            <button
                              onClick={() => handleManageAuth(course.id)}
                              className="action-button"
                              aria-label={`Gérer les autorisations pour le cours ${course.title}`}
                            >
                              {authCourseId === course.id ? <FaUserMinus /> : <FaUserPlus />}
                            </button>
                          </>
                        )}
                      </div>
                      {authCourseId === course.id && isAuthorized && (
                        <div className="auth-form">
                          <div className="input-group">
                            <input
                              type="text"
                              value={authAddresses}
                              onChange={(e) => {
                                setAuthAddresses(e.target.value);
                                validateAuthAddresses(e.target.value);
                              }}
                              placeholder="Adresses (séparées par des virgules)"
                              className={`edit-input ${authAddressesError ? 'input-error' : ''}`}
                              aria-label="Entrer les adresses à autoriser ou retirer"
                            />
                            {authAddressesError && (
                              <p className="input-error-message">{authAddressesError}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddAuthAddresses(course.id)}
                            className="save-button"
                            disabled={isLoading}
                            aria-label="Ajouter les adresses autorisées"
                          >
                            Ajouter
                          </button>
                          <button
                            onClick={() => handleRemoveAuthAddresses(course.id)}
                            className="cancel-button"
                            disabled={isLoading}
                            aria-label="Retirer les adresses autorisées"
                          >
                            Retirer
                          </button>
                          <button
                            onClick={() => setAuthCourseId(null)}
                            className="cancel-button"
                            aria-label="Annuler"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-courses-message">Aucun cours déposé.</p>
          )}
        </>
      )}
    </div>
  );
};

export default MyCoursesPage;