import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AdminPanel.css';

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

const AdminPanel = ({ web3, contract, account }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userAddresses, setUserAddresses] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [userFiliere, setUserFiliere] = useState(null);
  const [filieres, setFilieres] = useState([]);
  const [newFiliere, setNewFiliere] = useState('');
  const [filiereToRemove, setFiliereToRemove] = useState(null);
  const [updateFiliereAddresses, setUpdateFiliereAddresses] = useState('');
  const [updateFiliere, setUpdateFiliere] = useState(null);
  const [errors, setErrors] = useState({ 
    addresses: '', 
    name: '', 
    role: '', 
    filiere: '', 
    newFiliere: '',
    updateFiliereAddresses: '',
    updateFiliere: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const roleOptions = [
    { value: 0, label: 'Utilisateur' },
    { value: 1, label: 'Enseignant' },
    { value: 2, label: 'Étudiant' },
  ];

  const fetchFilieres = async () => {
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

  const checkAdmin = async () => {
    try {
      const role = await contract.methods.rolesUtilisateurs(account).call();
      setIsAdmin(Number(role) === 3);
      if (Number(role) !== 3) {
        toast.error('Accès réservé aux administrateurs');
      }
    } catch (error) {
      toast.error('Erreur lors de la vérification du rôle');
      console.error('Check Admin Error:', error);
    }
  };

  useEffect(() => {
    if (web3 && contract && account) {
      checkAdmin();
      fetchFilieres();
    }
  }, [web3, contract, account]);

  const validateForm = () => {
    const newErrors = { 
      addresses: '', 
      name: '', 
      role: '', 
      filiere: '', 
      newFiliere: '',
      updateFiliereAddresses: '',
      updateFiliere: ''
    };
    let isValid = true;

    if (!userAddresses.trim()) {
      newErrors.addresses = 'Veuillez entrer au moins une adresse';
      isValid = false;
    } else {
      const addressList = userAddresses.split(',').map(addr => addr.trim());
      if (userRole?.value === 2) {
        for (const addr of addressList) {
          if (!web3.utils.isAddress(addr)) {
            newErrors.addresses = `Adresse invalide : ${addr}`;
            isValid = false;
            break;
          }
        }
      } else {
        if (addressList.length > 1) {
          newErrors.addresses = 'Un seul utilisateur peut être défini pour ce rôle';
          isValid = false;
        } else if (!web3.utils.isAddress(addressList[0])) {
          newErrors.addresses = 'Adresse Ethereum invalide';
          isValid = false;
        }
      }
    }

    if (!userRole) {
      newErrors.role = 'Veuillez sélectionner un rôle';
      isValid = false;
    } else {
      if (userRole.value === 1 && !userName.trim()) {
        newErrors.name = 'Le nom est requis pour les enseignants';
        isValid = false;
      }
      if (userRole.value === 2 && (!userFiliere || !userFiliere.value)) {
        newErrors.filiere = 'La filière est requise pour les étudiants';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const validateFiliereForm = () => {
    if (!newFiliere.trim()) {
      setErrors({ ...errors, newFiliere: 'Le nom de la filière est requis' });
      return false;
    }
    if (newFiliere.length > 50) {
      setErrors({ ...errors, newFiliere: 'La filière ne doit pas dépasser 50 caractères' });
      return false;
    }
    setErrors({ ...errors, newFiliere: '' });
    return true;
  };

  const validateUpdateFiliereForm = () => {
    const newErrors = { ...errors };
    let isValid = true;

    if (!updateFiliereAddresses.trim()) {
      newErrors.updateFiliereAddresses = 'Veuillez entrer au moins une adresse';
      isValid = false;
    } else {
      const addressList = updateFiliereAddresses.split(',').map(addr => addr.trim());
      for (const addr of addressList) {
        if (!web3.utils.isAddress(addr)) {
          newErrors.updateFiliereAddresses = `Adresse invalide : ${addr}`;
          isValid = false;
          break;
        }
      }
    }

    if (!updateFiliere || !updateFiliere.value) {
      newErrors.updateFiliere = 'Veuillez sélectionner une filière';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAddFiliere = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Action non autorisée');
      return;
    }

    if (!validateFiliereForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      setIsLoading(true);
      await contract.methods
        .ajouterFiliere(newFiliere)
        .send({ from: account });
      toast.success('Filière ajoutée avec succès');
      setNewFiliere('');
      fetchFilieres();
    } catch (error) {
      toast.error(`Erreur : ${error.message}`);
      console.error('Add Filiere Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFiliere = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Action non autorisée');
      return;
    }

    if (!filiereToRemove) {
      setErrors({ ...errors, filiere: 'Veuillez sélectionner une filière à supprimer' });
      toast.error('Veuillez sélectionner une filière');
      return;
    }

    try {
      setIsLoading(true);
      await contract.methods
        .supprimerFiliere(filiereToRemove.value)
        .send({ from: account });
      toast.success('Filière supprimée avec succès');
      setFiliereToRemove(null);
      fetchFilieres();
    } catch (error) {
      toast.error(`Erreur : ${error.message}`);
      console.error('Remove Filiere Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Action non autorisée');
      return;
    }

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      setIsLoading(true);
      const addressList = userAddresses.split(',').map(addr => addr.trim());
      await contract.methods
        .definirRole(
          addressList,
          userRole.value,
          userRole.value === 1 ? userName : '',
          userRole.value === 2 && userFiliere ? userFiliere.value : ''
        )
        .send({ from: account });
      toast.success('Rôle(s) défini(s) avec succès');
      setUserAddresses('');
      setUserName('');
      setUserRole(null);
      setUserFiliere(null);
      setErrors({ ...errors, addresses: '', name: '', role: '', filiere: '' });
      fetchFilieres();
    } catch (error) {
      toast.error(`Erreur : ${error.message}`);
      console.error('Submit Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFiliere = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Action non autorisée');
      return;
    }

    if (!validateUpdateFiliereForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      setIsLoading(true);
      const addressList = updateFiliereAddresses.split(',').map(addr => addr.trim());
      await contract.methods
        .modifierFiliereUtilisateurs(addressList, updateFiliere.value)
        .send({ from: account });
      toast.success('Filière(s) des étudiant(s) mise(s) à jour avec succès');
      setUpdateFiliereAddresses('');
      setUpdateFiliere(null);
      setErrors({ ...errors, updateFiliereAddresses: '', updateFiliere: '' });
    } catch (error) {
      toast.error(`Erreur : ${error.message}`);
      console.error('Update Filiere Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return <div className="admin-panel"><p>Accès réservé aux administrateurs.</p></div>;
  }

  return (
    <div className="admin-panel">
      <h2>Panneau d'Administration</h2>
      
      <div className="form-section">
        <h3>Gérer les filières</h3>
        <form onSubmit={handleAddFiliere} className="admin-form">
          <div className="input-group">
            <label htmlFor="newFiliere">Ajouter une filière</label>
            <input
              type="text"
              id="newFiliere"
              value={newFiliere}
              onChange={(e) => setNewFiliere(e.target.value)}
              placeholder="Nom de la nouvelle filière"
              className={errors.newFiliere ? 'input-error' : ''}
              disabled={isLoading}
            />
            {errors.newFiliere && <p className="error-message">{errors.newFiliere}</p>}
          </div>
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? 'En cours...' : 'Ajouter la filière'}
          </button>
        </form>
        <form onSubmit={handleRemoveFiliere} className="admin-form">
          <div className="input-group">
            <label htmlFor="filiereToRemove">Supprimer une filière</label>
            <Select
              id="filiereToRemove"
              value={filiereToRemove}
              onChange={setFiliereToRemove}
              options={filieres}
              styles={customStyles}
              isDisabled={isLoading || filieres.length === 0}
              placeholder={filieres.length === 0 ? "Aucune filière disponible" : "Sélectionner une filière"}
            />
            {errors.filiere && <p className="error-message">{errors.filiere}</p>}
          </div>
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? 'En cours...' : 'Supprimer la filière'}
          </button>
        </form>
      </div>

      <div className="form-section">
        <h3>Assigner un rôle</h3>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="input-group">
            <label htmlFor="userAddresses">Adresse(s) Ethereum {userRole?.value === 2 ? '(séparées par des virgules)' : ''}</label>
            <input
              type="text"
              id="userAddresses"
              value={userAddresses}
              onChange={(e) => setUserAddresses(e.target.value)}
              placeholder={userRole?.value === 2 ? "0x..., 0x..." : "0x..."}
              className={errors.addresses ? 'input-error' : ''}
              disabled={isLoading}
            />
            {errors.addresses && <p className="error-message">{errors.addresses}</p>}
          </div>
          <div className="input-group">
            <label htmlFor="userRole">Rôle</label>
            <Select
              id="userRole"
              value={userRole}
              onChange={setUserRole}
              options={roleOptions}
              styles={customStyles}
              isDisabled={isLoading}
              placeholder="Sélectionner un rôle"
            />
            {errors.role && <p className="error-message">{errors.role}</p>}
          </div>
          {userRole?.value === 1 && (
            <div className="input-group">
              <label htmlFor="userName">Nom</label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Nom de l'enseignant"
                className={errors.name ? 'input-error' : ''}
                disabled={isLoading}
              />
              {errors.name && <p className="error-message">{errors.name}</p>}
            </div>
          )}
          {userRole?.value === 2 && (
            <div className="input-group">
              <label htmlFor="userFiliere">Filière</label>
              <Select
                id="userFiliere"
                value={userFiliere}
                onChange={setUserFiliere}
                options={filieres}
                styles={customStyles}
                isDisabled={isLoading || filieres.length === 0}
                placeholder={filieres.length === 0 ? "Aucune filière disponible" : "Sélectionner une filière"}
              />
              {errors.filiere && <p className="error-message">{errors.filiere}</p>}
            </div>
          )}
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? 'En cours...' : 'Assigner le(s) rôle(s)'}
          </button>
        </form>
      </div>

      <div className="form-section">
        <h3>Modifier la filière des étudiants</h3>
        <form onSubmit={handleUpdateFiliere} className="admin-form">
          <div className="input-group">
            <label htmlFor="updateFiliereAddresses">Adresse(s) Ethereum des étudiants (séparées par des virgules)</label>
            <input
              type="text"
              id="updateFiliereAddresses"
              value={updateFiliereAddresses}
              onChange={(e) => setUpdateFiliereAddresses(e.target.value)}
              placeholder="0x..., 0x..."
              className={errors.updateFiliereAddresses ? 'input-error' : ''}
              disabled={isLoading}
            />
            {errors.updateFiliereAddresses && <p className="error-message">{errors.updateFiliereAddresses}</p>}
          </div>
          <div className="input-group">
            <label htmlFor="updateFiliere">Filière</label>
            <Select
              id="updateFiliere"
              value={updateFiliere}
              onChange={setUpdateFiliere}
              options={filieres}
              styles={customStyles}
              isDisabled={isLoading || filieres.length === 0}
              placeholder={filieres.length === 0 ? "Aucune filière disponible" : "Sélectionner une filière"}
            />
            {errors.updateFiliere && <p className="error-message">{errors.updateFiliere}</p>}
          </div>
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? 'En cours...' : 'Modifier la filière des étudiants'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminPanel;