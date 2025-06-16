import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaArrowLeft, FaArrowRight, FaCopy } from 'react-icons/fa';
import { debounce } from 'lodash';
import './TransactionHistory.css';

const TransactionHistory = ({ web3, contract, account }) => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const searchInputRef = useRef(null);

  const fetchTransactionHistory = useCallback(async () => {
    if (!web3 || !contract || !account) {
      setMessage('Veuillez connecter MetaMask');
      toast.error('MetaMask non connecté');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const events = [
        'CoursDepose',
        'CoursModifie',
        'CoursSupprime',
        'AutorisationCoursModifiee',
        'RoleMisAJour',
        'FiliereAjoutee',
        'FiliereSupprimee',
        'FiliereModifiee'
      ];

      const transactionData = [];

      for (const eventName of events) {
        const pastEvents = await contract.getPastEvents(eventName, {
          fromBlock: 0,
          toBlock: 'latest'
        });

        for (const event of pastEvents) {
          const { transactionHash, blockNumber, returnValues } = event;
          let description = '';

          switch (eventName) {
            case 'CoursDepose':
              description = `Cours "${returnValues.titre}" (ID: ${returnValues.id}) déposé par ${returnValues.nomProprietaire} dans la filière ${returnValues.filiere}`;
              break;
            case 'CoursModifie':
              description = `Cours "${returnValues.titre}" (ID: ${returnValues.id}) modifié${returnValues.estPublic ? ' (public)' : ''} dans la filière ${returnValues.filiere}`;
              break;
            case 'CoursSupprime':
              description = `Cours ID: ${returnValues.id} supprimé`;
              break;
            case 'AutorisationCoursModifiee':
              description = `Autorisation ${returnValues.autorise ? 'ajoutée' : 'retirée'} pour l'utilisateur ${returnValues.utilisateur} sur le cours ID: ${returnValues.coursId}`;
              break;
            case 'RoleMisAJour':
              description = `Rôle mis à jour pour ${returnValues.utilisateur}: ${returnValues.role === '0' ? 'Utilisateur' : returnValues.role === '1' ? 'Enseignant' : returnValues.role === '2' ? 'Étudiant' : 'Administrateur'}${returnValues.nom ? ` (Nom: ${returnValues.nom})` : ''}${returnValues.filiere ? ` (Filière: ${returnValues.filiere})` : ''}`;
              break;
            case 'FiliereAjoutee':
              description = `Filière "${returnValues.filiere}" ajoutée`;
              break;
            case 'FiliereSupprimee':
              description = `Filière "${returnValues.filiere}" supprimée`;
              break;
            case 'FiliereModifiee':
              description = `Filière de l'utilisateur ${returnValues.utilisateur} modifiée en ${returnValues.nouvelleFiliere}`;
              break;
            default:
              description = 'Événement inconnu';
          }

          transactionData.push({
            id: transactionHash,
            event: eventName,
            description,
            blockNumber: Number(blockNumber), // Convert BigInt to Number
            timestamp: null
          });
        }
      }

      // Fetch timestamps for each transaction
      for (const tx of transactionData) {
        try {
          const block = await web3.eth.getBlock(tx.blockNumber);
          tx.timestamp = new Date(block.timestamp * 1000).toLocaleString();
        } catch (error) {
          console.error(`Erreur lors de la récupération du bloc ${tx.blockNumber}:`, error);
          tx.timestamp = 'Inconnu';
        }
      }

      // Sort transactions by block number (most recent first)
      transactionData.sort((a, b) => b.blockNumber - a.blockNumber);

      setTransactions(transactionData);
      setFilteredTransactions(transactionData);
      setMessage(transactionData.length > 0 ? '' : 'Aucune transaction trouvée');
    } catch (error) {
      setMessage(`Erreur : ${error.message}`);
      toast.error('Erreur lors du chargement de l\'historique des transactions');
      console.error('Fetch Transaction History Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [web3, contract, account]);

  useEffect(() => {
    fetchTransactionHistory();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [fetchTransactionHistory]);

  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
      const filtered = transactions.filter((tx) =>
        tx.description.toLowerCase().includes(value.toLowerCase()) ||
        tx.id.toLowerCase().includes(value.toLowerCase()) ||
        tx.event.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredTransactions(filtered);
      setMessage(filtered.length > 0 ? '' : value ? 'Aucune transaction trouvée pour cette recherche' : 'Aucune transaction disponible');
      setCurrentPage(1);
    }, 300),
    [transactions]
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyTransactionHash = (hash) => {
    navigator.clipboard.writeText(hash).then(() => {
      toast.info('Hachage de la transaction copié dans le presse-papiers');
    });
  };

  return (
    <div className="trans-container">
      <h2 className="courses-title">Historique des Transactions</h2>
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
          <div className="courses-section">
            <div className="search-filter-container">
              <input
                type="text"
                placeholder="Rechercher par description, événement ou hachage..."
                onChange={handleSearchChange}
                className="search-input"
                ref={searchInputRef}
                aria-label="Rechercher dans l'historique des transactions"
                disabled={isLoading}
              />
            </div>
            <div className="message-wrapper">
              <div
                className={`message-container ${
                  filteredTransactions.length === 0 && searchTerm ? 'visible' : ''
                }`}
              >
                <p className="no-transactions-message">Aucune transaction trouvée pour cette recherche.</p>
              </div>
            </div>
            {filteredTransactions.length > 0 && (
              <>
                <ul className="courses-list">
                  {currentTransactions.map((tx) => (
                    <li key={tx.id} className="course">
                      <div className="course-details">
                        <span className="course-title">{tx.description}</span>
                        <p>
                          <strong>Événement :</strong> {tx.event}
                        </p>
                        <p>
                          <strong>Bloc :</strong> {tx.blockNumber}
                        </p>
                        <p>
                          <strong>Date :</strong> {tx.timestamp}
                        </p>
                        <p className="copyable-field">
                          <strong>Hachage :</strong>{' '}
                          <span>
                            {tx.id.slice(0, 10)}...{tx.id.slice(-10)}
                            <button
                              onClick={() => copyTransactionHash(tx.id)}
                              className="copy-button"
                              aria-label="Copier le hachage de la transaction"
                            >
                              <FaCopy />
                            </button>
                          </span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
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
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionHistory;