import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaCopy } from 'react-icons/fa';
import './TeacherPanel.css';

const customStyles = {
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? 'var(--primary)' : 'var(--secondary)',
    color: state.isFocused ? 'var(--text-light)' : 'var(--text-dark)',
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

const TeacherPanel = ({ web3, contract, account }) => {
  const [title, setTitle] = useState('');
  const [ipfsHash, setIpfsHash] = useState('');
  const [file, setFile] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [filiere, setFiliere] = useState(null);
  const [filieres, setFilieres] = useState([]);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [filiereError, setFiliereError] = useState('');
  const fileInputRef = useRef(null);

  const pinataApiKey = process.env.REACT_APP_PINATA_API_KEY;
  const pinataSecretApiKey = process.env.REACT_APP_PINATA_SECRET_API_KEY;

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

  useEffect(() => {
    fetchFilieres();
  }, [web3, contract, account]);

  const validateTitle = (value) => {
    if (!value.trim()) {
      setTitleError('Le titre du cours est requis');
      return false;
    }
    if (value.length > 100) {
      setTitleError('Le titre ne doit pas dépasser 100 caractères');
      return false;
    }
    setTitleError('');
    return true;
  };

  const validateFiliere = () => {
    if (!filiere || !filiere.value) {
      setFiliereError('La filière est requise');
      return false;
    }
    setFiliereError('');
    return true;
  };

  const uploadToIPFS = async () => {
    if (!file) {
      setMessage('Veuillez sélectionner un fichier');
      toast.error('Aucun fichier sélectionné');
      return;
    }

    if (!pinataApiKey || !pinataSecretApiKey) {
      toast.error('Clés API Pinata manquantes ! Vérifie ton .env');
      return;
    }

    setIsUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP : ${response.status}`);
      }

      const data = await response.json();
      const hash = data.IpfsHash;
      setIpfsHash(hash);
      setMessage(`Fichier uploadé sur IPFS : ${hash}`);
      toast.success('Fichier uploadé sur IPFS !');
    } catch (error) {
      console.error("Erreur lors de l'upload IPFS :", error);
      setMessage(`Erreur lors de l'upload IPFS : ${error.message}`);
      toast.error('Erreur lors de l’upload IPFS');
    } finally {
      setIsUploading(false);
    }
  };

  const depositCourse = async () => {
    if (!web3 || !contract || !account) {
      setMessage('Veuillez connecter MetaMask');
      toast.error('MetaMask non connecté');
      return;
    }
    if (!validateTitle(title) || !validateFiliere()) return;
    if (!ipfsHash) {
      setMessage('Veuillez uploader un fichier sur IPFS');
      toast.error('Hachage IPFS manquant');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      await contract.methods.deposerCours(title, ipfsHash, isPublic, filiere.value).send({ from: account });
      setMessage('Cours déposé avec succès !');
      toast.success('Cours déposé sur la blockchain !');
      setTitle('');
      setIpfsHash('');
      setFile(null);
      setFiliere(null);
      setIsPublic(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setMessage(`Erreur : ${error.message}`);
      toast.error('Erreur lors du dépôt du cours');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyIpfsHash = () => {
    if (ipfsHash) {
      navigator.clipboard.writeText(ipfsHash);
      toast.info('Hachage IPFS copié dans le presse-papiers');
    }
  };

  return (
    <div className="teacher-panel">
      <h2 className="panel-title">Panneau Enseignant</h2>

      <div className="form-section">
        <h3 className="section-title">Déposer un cours</h3>
        <div className="input-group">
          <label className="input-label" htmlFor="course-title">
            Titre du cours
          </label>
          <input
            id="course-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              validateTitle(e.target.value);
            }}
            className={`input-field ${titleError ? 'input-error' : ''}`}
            placeholder="Ex. : Programmation Orientée Objet"
            aria-describedby="title-error"
            disabled={isSubmitting}
          />
          {titleError && (
            <p className="error-message" id="title-error">
              {titleError}
            </p>
          )}
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="filiere-select">
            Filière
          </label>
          <Select
            inputId="filiere-select"
            value={filiere}
            onChange={(selected) => {
              setFiliere(selected);
              validateFiliere();
            }}
            options={filieres}
            styles={customStyles}
            isDisabled={isSubmitting || filieres.length === 0}
            placeholder={filieres.length === 0 ? "Aucune filière disponible" : "Sélectionner une filière"}
            aria-label="Sélectionner une filière"
          />
          {filiereError && (
            <p className="error-message" id="filiere-error">
              {filiereError}
            </p>
          )}
        </div>

        <div className="input-group horizontal-group">
          <label className="input-label" htmlFor="file-upload">
            Fichier : {file ? file.name : 'Aucun fichier sélectionné'}
          </label>
          <div className="file-upload-wrapper">
            <input
              id="file-upload"
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="input-field"
              ref={fileInputRef}
              disabled={isUploading || isSubmitting}
              aria-label="Choisir un fichier à uploader"
            />
            <button
              onClick={uploadToIPFS}
              className={`submit-button ${isUploading ? 'disabled' : ''}`}
              disabled={isUploading || isSubmitting}
              aria-label="Uploader le fichier sur IPFS"
            >
              {isUploading ? 'Upload en cours...' : 'Uploader sur IPFS'}
            </button>
          </div>
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="ipfs-hash">
            Hachage IPFS
          </label>
          <div className="ipfs-hash-wrapper">
            <input
              id="ipfs-hash"
              type="text"
              value={ipfsHash}
              readOnly
              className="input-field readonly"
              placeholder="Hachage généré après upload"
              aria-describedby="ipfs-hash-description"
            />
            {ipfsHash && (
              <button
                onClick={copyIpfsHash}
                className="copy-button"
                title="Copier le hachage IPFS"
                aria-label="Copier le hachage IPFS dans le presse-papiers"
              >
                <FaCopy />
              </button>
            )}
          </div>
          <span id="ipfs-hash-description" className="sr-only">
            Champ en lecture seule contenant le hachage IPFS du fichier uploadé
          </span>
        </div>

        <div className="input-group checkbox-group">
          <label className="checkbox-label" htmlFor="is-public">
            <input
              id="is-public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="checkbox-input"
              disabled={isSubmitting}
              aria-label="Rendre le cours public"
            />
            <span className="checkbox-text">Cours public</span>
          </label>
        </div>

        <div className="button-container">
          <button
            onClick={depositCourse}
            className={`submit-button ${isSubmitting ? 'disabled' : ''}`}
            disabled={isSubmitting}
            aria-label="Déposer le cours sur la blockchain"
          >
            {isSubmitting ? 'Dépôt en cours...' : 'Déposer le cours'}
          </button>
        </div>
      </div>

      {message && <p className="error-message">{message}</p>}
    </div>
  );
};

export default TeacherPanel;