import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import { FaUserShield, FaChalkboardTeacher, FaUserGraduate, FaWallet, FaSignOutAlt, FaHistory } from 'react-icons/fa';
import CourseArchive from './CourseArchive.json';
import AdminPanel from './components/AdminPanel';
import TeacherPanel from './components/TeacherPanel';
import CoursesList from './components/CoursesList';
import TeacherList from './components/TeacherList';
import MyCoursesPage from './components/MyCoursesPage';
import FilierePage from './components/FilierePage';
import TransactionHistory from './components/TransactionHistory';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [network, setNetwork] = useState(null);
  const [privateKey, setPrivateKey] = useState('');

  const contractAddress = "0x4fb69Dd402775211f44a02718546a563Ee15Dd26"; // Mettez à jour avec l'adresse de votre contrat déployé sur Ganache
  const ganacheUrl = 'http://127.0.0.1:7545'; // URL par défaut de Ganache, ajustez si nécessaire

  const initializeWeb3 = useCallback(async () => {
    setIsLoading(true);
    setError('');

    if (!privateKey) {
      setError('Veuillez entrer une clé privée valide.');
      setIsLoading(false);
      toast.error('Clé privée requise !');
      return;
    }

    try {
      // Initialiser Web3 avec le provider Ganache
      const web3Instance = new Web3(ganacheUrl);
      setWeb3(web3Instance);

      // Créer un compte à partir de la clé privée
      let accountFromPrivateKey;
      try {
        accountFromPrivateKey = web3Instance.eth.accounts.privateKeyToAccount(privateKey);
        web3Instance.eth.accounts.wallet.add(accountFromPrivateKey);
        web3Instance.eth.defaultAccount = accountFromPrivateKey.address;
      } catch (err) {
        setError('Clé privée invalide.');
        setIsLoading(false);
        toast.error('Clé privée invalide.');
        return;
      }

      setAccount(accountFromPrivateKey.address);

      // Définir le réseau comme Ganache
      setNetwork('Ganache');

      // Initialiser le contrat
      const contractInstance = new web3Instance.eth.Contract(CourseArchive.abi, contractAddress);
      setContract(contractInstance);

      // Vérifier le rôle de l'utilisateur
      const adminAddress = await contractInstance.methods.ADMIN_ADDRESS().call();
      setIsAdmin(accountFromPrivateKey.address.toLowerCase() === adminAddress.toLowerCase());

      const role = await contractInstance.methods.rolesUtilisateurs(accountFromPrivateKey.address).call();
      setIsTeacher(Number(role) === 1);
      setIsStudent(Number(role) === 2);

      toast.success(`Connecté avec succès : ${accountFromPrivateKey.address.slice(0, 6)}...${accountFromPrivateKey.address.slice(-4)}`);
    } catch (err) {
      setError(`Erreur : ${err.message}`);
      toast.error('Erreur lors de la connexion.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [privateKey]);

  const handlePrivateKeySubmit = (e) => {
    e.preventDefault();
    initializeWeb3();
  };

  const handleDisconnect = () => {
    setAccount(null);
    setWeb3(null);
    setContract(null);
    setIsAdmin(false);
    setIsTeacher(false);
    setIsStudent(false);
    setPrivateKey('');
    setError('Vous êtes déconnecté. Veuillez entrer votre clé privée pour vous reconnecter.');
    toast.info('Déconnexion effectuée.');
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <nav className="navbar">
          <div className="navbar-content-dis">
            <img src="/logo.png" alt="Logo Course Archive" style={{ height: '40px', marginRight: '1rem' }} />
            <h1 className="navbar-title">CoursNetX</h1>
          </div>
        </nav>
        <div className="content-container">
          <div className="loading-spinner">
            <p>Connexion en cours...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!web3 || !account) {
    return (
      <div className="app-container">
        <nav className="navbar">
          <div className="navbar-content-dis">
            <img src="/logo.png" alt="Logo Course Archive" style={{ height: '80px', marginRight: '1rem' }} />
            <h1 className="navbar-title">CoursNetX</h1>
          </div>
        </nav>
        <div className="content-container">
          <div className="welcome-card">
            <h2 className="home-title">🔗 Connexion requise</h2>
            <img src="/meta.png" alt="Welcome" className="welcome-image" />
            <p className="welcome-subtext">{error || 'Veuillez entrer votre clé privée pour vous connecter.'}</p>
            <form onSubmit={handlePrivateKeySubmit} className="private-key-form">
              <input
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Entrez votre clé privée"
                className="private-key-input"
                aria-label="Clé privée"
              />
              <button type="submit" className="connect-button" aria-label="Se connecter avec la clé privée">
                <FaWallet /> Se connecter
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="navbar-content">
            <div className='nav-name'>
              <img src="/logo.png" alt="Logo Course Archive" style={{ height: '40px', marginRight: '1rem' }} />
              <h1 className="navbar-title">CoursNetX</h1>
            </div>
            <div className="navbar-links">
              <Link to="/" className="nav-link">Accueil</Link>
              {isAdmin && <Link to="/admin" className="nav-link">Admin</Link>}
              {isTeacher && <Link to="/teacher" className="nav-link">Enseignant</Link>}
              {isTeacher && <Link to="/my-courses" className="nav-link">Mes Cours</Link>}
              <Link to="/courses" className="nav-link">Cours</Link>
              <Link to="/teachers" className="nav-link">Enseignants</Link>
              <Link to="/filieres" className="nav-link">Filières</Link>
              <Link to="/transactions" className="nav-link">Historique</Link>
              <button
                className="disconnect-button"
                onClick={handleDisconnect}
                title="Déconnexion"
                aria-label="Déconnexion"
              >
                <FaSignOutAlt />
              </button>
            </div>
          </div>
        </nav>

        <div className="content-container">
          {error && <p className="error-message">{error}</p>}
          <Routes>
            <Route
              path="/"
              element={
                <div className="home-page">
                  <div className="welcome-card">
                    <h2 className="home-title">🎓 Bienvenue sur CoursNetX</h2>
                    <p className="welcome-text">
                      <strong>Compte connecté :</strong>{' '}
                      <span className="highlight" title={account}>
                        {account.slice(0, 6)}...{account.slice(-4)}
                      </span>
                    </p>
                    <p className="welcome-text">
                      <strong>Réseau :</strong> <span className="highlight">{network}</span>
                    </p>
                    <p className="welcome-text">
                      <strong>Rôle :</strong>{' '}
                      {isAdmin ? (
                        <span className="role admin"><FaUserShield /> Administrateur</span>
                      ) : isTeacher ? (
                        <span className="role teacher"><FaChalkboardTeacher /> Enseignant</span>
                      ) : isStudent ? (
                        <span className="role student"><FaUserGraduate /> Étudiant</span>
                      ) : (
                        <span className="role unknown">Utilisateur</span>
                      )}
                    </p>
                    <p className="welcome-subtext">
                      Ce portail décentralisé permet l’archivage sécurisé et transparent des cours.
                    </p>
                  </div>
                </div>
              }
            />
            <Route
              path="/admin"
              element={isAdmin ? (
                <AdminPanel web3={web3} contract={contract} account={account} />
              ) : (
                <Navigate to="/" replace />
              )}
            />
            <Route
              path="/teacher"
              element={isTeacher ? (
                <TeacherPanel web3={web3} contract={contract} account={account} />
              ) : (
                <Navigate to="/" replace />
              )}
            />
            <Route
              path="/my-courses"
              element={isTeacher ? (
                <MyCoursesPage web3={web3} contract={contract} account={account} />
              ) : (
                <Navigate to="/" replace />
              )}
            />
            <Route
              path="/courses"
              element={<CoursesList web3={web3} contract={contract} account={account} />}
            />
            <Route
              path="/teachers"
              element={<TeacherList web3={web3} contract={contract} account={account} />}
            />
            <Route
              path="/filieres"
              element={<FilierePage web3={web3} contract={contract} account={account} />}
            />
            <Route
              path="/transactions"
              element={<TransactionHistory web3={web3} contract={contract} account={account} />}
            />
          </Routes>
        </div>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </Router>
  );
};

export default App;