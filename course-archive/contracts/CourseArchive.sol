// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CourseArchive {
    address public constant ADMIN_ADDRESS = 0xDba841e872946b011f3554887906df5A2715509F;
    enum Role { Aucun, Enseignant, Etudiant, Administrateur }
    struct Course {
        uint id;
        string titre;
        string hachageIPFS;
        string nomProprietaire;
        bool estPublic;
        string filiere;
    }

    mapping(address => Role) public rolesUtilisateurs;
    mapping(address => string) public nomsUtilisateurs;
    mapping(address => string) public filieresUtilisateurs;
    mapping(uint => Course) public cours;
    mapping(uint => address) public coursProprietaireAddress;
    mapping(uint => mapping(address => bool)) public coursAutorisations;
    address[] public teachers;
    address[] public students;
    uint public nombreCours;
    bool private adminInitialise;

    // Storage for filières
    string[] private filieres;
    mapping(string => bool) private filiereExists;

    event AdminInitialise(address admin);
    event RoleMisAJour(address utilisateur, Role role, string nom, string filiere);
    event FiliereModifiee(address utilisateur, string nouvelleFiliere);
    event CoursDepose(uint id, string titre, string hachageIPFS, string nomProprietaire, string filiere);
    event CoursModifie(uint id, string titre, string hachageIPFS, bool estPublic, string filiere);
    event CoursSupprime(uint id);
    event AutorisationCoursModifiee(uint coursId, address utilisateur, bool autorise);
    event FiliereAjoutee(string filiere);
    event FiliereSupprimee(string filiere);

    modifier seulementAdministrateur() {
        require(rolesUtilisateurs[msg.sender] == Role.Administrateur, "Seuls les administrateurs peuvent effectuer cette action");
        _;
    }

    modifier seulementEnseignant() {
        require(rolesUtilisateurs[msg.sender] == Role.Enseignant, "Seuls les enseignants peuvent effectuer cette action");
        _;
    }

    modifier seulementProprietaireOuAdmin(uint coursId) {
        require(cours[coursId].id != 0, "Le cours n'existe pas");
        require(
            coursProprietaireAddress[coursId] == msg.sender || 
            rolesUtilisateurs[msg.sender] == Role.Administrateur,
            "Seuls le proprietaire ou l'administrateur peuvent effectuer cette action"
        );
        _;
    }

    function initialiserAdmin() public {
        require(!adminInitialise, "L'administrateur est deja initialise");
        rolesUtilisateurs[ADMIN_ADDRESS] = Role.Administrateur;
        nomsUtilisateurs[ADMIN_ADDRESS] = "Administrateur";
        adminInitialise = true;
        emit AdminInitialise(ADMIN_ADDRESS);
    }

    function ajouterFiliere(string memory filiere) public seulementAdministrateur {
        require(bytes(filiere).length > 0, "La filiere ne peut pas etre vide");
        require(!filiereExists[filiere], "La filiere existe deja");
        filieres.push(filiere);
        filiereExists[filiere] = true;
        emit FiliereAjoutee(filiere);
    }

    function supprimerFiliere(string memory filiere) public seulementAdministrateur {
        require(filiereExists[filiere], "La filiere n'existe pas");
        require(bytes(filiere).length > 0, "La filiere ne peut pas etre vide");
        
        for (uint i = 0; i < students.length; i++) {
            require(
                keccak256(bytes(filieresUtilisateurs[students[i]])) != keccak256(bytes(filiere)),
                "La filiere est assignee a des etudiants"
            );
        }
        for (uint i = 1; i <= nombreCours; i++) {
            if (cours[i].id != 0) {
                require(
                    keccak256(bytes(cours[i].filiere)) != keccak256(bytes(filiere)),
                    "La filiere est assignee a des cours"
                );
            }
        }

        for (uint i = 0; i < filieres.length; i++) {
            if (keccak256(bytes(filieres[i])) == keccak256(bytes(filiere))) {
                filieres[i] = filieres[filieres.length - 1];
                filieres.pop();
                break;
            }
        }
        filiereExists[filiere] = false;
        emit FiliereSupprimee(filiere);
    }

    function definirRole(address[] memory utilisateurs, uint role, string memory nom, string memory filiere) public seulementAdministrateur {
        require(role <= uint(Role.Administrateur), "Role invalide");
        if (role == uint(Role.Etudiant)) {
            require(bytes(filiere).length > 0, "La filiere est requise pour les etudiants");
            require(filiereExists[filiere], "La filiere n'existe pas");
            require(utilisateurs.length > 0, "La liste des utilisateurs ne peut pas etre vide");
            
            for (uint i = 0; i < utilisateurs.length; i++) {
                require(utilisateurs[i] != address(0), "Adresse invalide");
                if (rolesUtilisateurs[utilisateurs[i]] != Role.Etudiant) {
                    students.push(utilisateurs[i]);
                } else {
                    for (uint j = 0; j < students.length; j++) {
                        if (students[j] == utilisateurs[i]) {
                            students[j] = students[students.length - 1];
                            students.pop();
                            break;
                        }
                    }
                    students.push(utilisateurs[i]);
                }
                rolesUtilisateurs[utilisateurs[i]] = Role.Etudiant;
                filieresUtilisateurs[utilisateurs[i]] = filiere;
                emit RoleMisAJour(utilisateurs[i], Role.Etudiant, "", filiere);
            }
        } else {
            require(utilisateurs.length == 1, "Un seul utilisateur peut etre defini pour ce role");
            address utilisateur = utilisateurs[0];
            require(utilisateur != address(0), "Adresse invalide");

            if (role == uint(Role.Enseignant)) {
                require(bytes(nom).length > 0, "Le nom est requis pour les enseignants");
                if (rolesUtilisateurs[utilisateur] != Role.Enseignant) {
                    teachers.push(utilisateur);
                }
            } else {
                if (rolesUtilisateurs[utilisateur] == Role.Enseignant) {
                    for (uint i = 0; i < teachers.length; i++) {
                        if (teachers[i] == utilisateur) {
                            teachers[i] = teachers[teachers.length - 1];
                            teachers.pop();
                            break;
                        }
                    }
                }
            }

            if (rolesUtilisateurs[utilisateur] == Role.Etudiant) {
                for (uint i = 0; i < students.length; i++) {
                    if (students[i] == utilisateur) {
                        students[i] = students[students.length - 1];
                        students.pop();
                        break;
                    }
                }
            }

            rolesUtilisateurs[utilisateur] = Role(role);
            nomsUtilisateurs[utilisateur] = (role == uint(Role.Enseignant)) ? nom : "";
            filieresUtilisateurs[utilisateur] = "";
            emit RoleMisAJour(utilisateur, Role(role), nom, "");
        }
    }

    function modifierFiliereEtudiant(address utilisateur, string memory nouvelleFiliere) public seulementAdministrateur {
        require(rolesUtilisateurs[utilisateur] == Role.Etudiant, "L'utilisateur doit etre un etudiant");
        require(bytes(nouvelleFiliere).length > 0, "La nouvelle filiere ne peut pas etre vide");
        require(filiereExists[nouvelleFiliere], "La filiere n'existe pas");
        filieresUtilisateurs[utilisateur] = nouvelleFiliere;
        emit FiliereModifiee(utilisateur, nouvelleFiliere);
    }

    function modifierFiliereUtilisateurs(address[] memory utilisateurs, string memory nouvelleFiliere) public seulementAdministrateur {
        require(bytes(nouvelleFiliere).length > 0, "La nouvelle filiere ne peut pas etre vide");
        require(filiereExists[nouvelleFiliere], "La filiere n'existe pas");
        require(utilisateurs.length > 0, "La liste des utilisateurs ne peut pas etre vide");
        require(utilisateurs.length <= 100, "Trop d'utilisateurs dans une seule transaction");
        for (uint i = 0; i < utilisateurs.length; i++) {
            require(utilisateurs[i] != address(0), "Adresse invalide");
            require(rolesUtilisateurs[utilisateurs[i]] == Role.Etudiant, "L'utilisateur doit etre un etudiant");
            filieresUtilisateurs[utilisateurs[i]] = nouvelleFiliere;
            emit FiliereModifiee(utilisateurs[i], nouvelleFiliere);
        }
    }

    function obtenirNomUtilisateur(address utilisateur) public view returns (string memory) {
        return nomsUtilisateurs[utilisateur];
    }

    function obtenirFiliereUtilisateur(address utilisateur) public view returns (string memory) {
        return filieresUtilisateurs[utilisateur];
    }

    function obtenirListeEnseignants() public view returns (address[] memory) {
        return teachers;
    }

    function deposerCours(string memory titre, string memory hachageIPFS, bool estPublic, string memory filiere) public seulementEnseignant {
        require(bytes(nomsUtilisateurs[msg.sender]).length > 0, "Le nom de l'enseignant doit etre defini");
        require(bytes(titre).length > 0, "Le titre ne peut pas etre vide");
        require(bytes(hachageIPFS).length > 0, "Le hachage IPFS ne peut pas etre vide");
        require(bytes(filiere).length > 0, "La filiere ne peut pas etre vide");
        require(filiereExists[filiere], "La filiere n'existe pas");
        nombreCours++;
        cours[nombreCours] = Course(nombreCours, titre, hachageIPFS, nomsUtilisateurs[msg.sender], estPublic, filiere);
        coursProprietaireAddress[nombreCours] = msg.sender;
        emit CoursDepose(nombreCours, titre, hachageIPFS, nomsUtilisateurs[msg.sender], filiere);
    }

    function ajouterAutorisationCours(uint coursId, address utilisateur) public seulementProprietaireOuAdmin(coursId) {
        require(cours[coursId].id != 0, "Le cours n'existe pas");
        require(utilisateur != address(0), "Adresse invalide");
        require(!coursAutorisations[coursId][utilisateur], "Utilisateur deja autorise");
        coursAutorisations[coursId][utilisateur] = true;
        emit AutorisationCoursModifiee(coursId, utilisateur, true);
    }

    function retirerAutorisationCours(uint coursId, address utilisateur) public seulementProprietaireOuAdmin(coursId) {
        require(cours[coursId].id != 0, "Le cours n'existe pas");
        require(utilisateur != address(0), "Adresse invalide");
        require(coursAutorisations[coursId][utilisateur], "Utilisateur non autorise");
        coursAutorisations[coursId][utilisateur] = false;
        emit AutorisationCoursModifiee(coursId, utilisateur, false);
    }

    function modifierCours(uint coursId, string memory titre, string memory hachageIPFS, bool estPublic, string memory filiere) 
        public seulementProprietaireOuAdmin(coursId) {
        require(bytes(titre).length > 0, "Le titre ne peut pas etre vide");
        require(bytes(hachageIPFS).length > 0, "Le hachage IPFS ne peut pas etre vide");
        require(bytes(filiere).length > 0, "La filiere ne peut pas etre vide");
        require(filiereExists[filiere], "La filiere n'existe pas");
        cours[coursId].titre = titre;
        cours[coursId].hachageIPFS = hachageIPFS;
        cours[coursId].estPublic = estPublic;
        cours[coursId].filiere = filiere;
        emit CoursModifie(coursId, titre, hachageIPFS, estPublic, filiere);
    }

    function supprimerCours(uint coursId) public seulementProprietaireOuAdmin(coursId) {
        delete cours[coursId];
        delete coursProprietaireAddress[coursId];
        emit CoursSupprime(coursId);
    }

    function estAutorise(uint coursId, address utilisateur) public view returns (bool) {
        if (cours[coursId].id == 0) return false;
        
        if (cours[coursId].estPublic || 
            coursProprietaireAddress[coursId] == utilisateur || 
            rolesUtilisateurs[utilisateur] == Role.Administrateur) {
            return true;
        }
        
        if (coursAutorisations[coursId][utilisateur]) {
            return true;
        }
        
        if (rolesUtilisateurs[utilisateur] == Role.Etudiant) {
            return keccak256(bytes(filieresUtilisateurs[utilisateur])) == keccak256(bytes(cours[coursId].filiere));
        }
        
        return false;
    }

    function obtenirCours(uint coursId) public view returns (string memory, string memory, string memory, bool, string memory) {
        require(cours[coursId].id != 0, "Le cours n'existe pas");
        require(estAutorise(coursId, msg.sender), "Vous n'etes pas autorise a acceder a ce cours");
        Course memory course = cours[coursId];
        return (course.titre, course.hachageIPFS, course.nomProprietaire, course.estPublic, course.filiere);
    }

    function obtenirListeCours() public view returns (uint[] memory) {
        uint validCount = 0;
        for (uint i = 1; i <= nombreCours; i++) {
            if (cours[i].id != 0) {
                validCount++;
            }
        }
        uint[] memory listeCours = new uint[](validCount);
        uint index = 0;
        for (uint i = 1; i <= nombreCours; i++) {
            if (cours[i].id != 0) {
                listeCours[index] = i;
                index++;
            }
        }
        return listeCours;
    }

    function obtenirFilieres() public view returns (string[] memory) {
        return filieres;
    }

    function obtenirCoursParFiliere(string memory filiere) public view returns (uint[] memory) {
        require(filiereExists[filiere], "La filiere n'existe pas");
        uint validCount = 0;
        for (uint i = 1; i <= nombreCours; i++) {
            if (cours[i].id != 0 && keccak256(bytes(cours[i].filiere)) == keccak256(bytes(filiere))) {
                validCount++;
            }
        }

        uint[] memory courseIds = new uint[](validCount);
        uint index = 0;
        for (uint i = 1; i <= nombreCours; i++) {
            if (cours[i].id != 0 && keccak256(bytes(cours[i].filiere)) == keccak256(bytes(filiere))) {
                courseIds[index] = i;
                index++;
            }
        }
        return courseIds;
    }
}