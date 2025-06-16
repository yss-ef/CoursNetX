const CourseArchive = artifacts.require("CourseArchive");
const { expect } = require("chai");

contract("CourseArchive", (accounts) => {
  let courseArchive;
  const admin = accounts[0];
  const enseignant = accounts[1];
  const etudiant = accounts[2];
  const utilisateurNonAutorise = accounts[3];
  const hachageIPFSMock = "QmTestHash123";
  const filiere = "Informatique";

  // Fonction pour enregistrer l'utilisation du gas
  const enregistrerUtilisationGas = async (tx, description) => {
    const reçu = await web3.eth.getTransactionReceipt(tx.tx);
    console.log(`${description} : Gas utilisé = ${reçu.gasUsed}`);
    return reçu.gasUsed;
  };

  beforeEach(async () => {
    courseArchive = await CourseArchive.new();
    const txInitAdmin = await courseArchive.initialiserAdmin({ from: admin });
    await enregistrerUtilisationGas(txInitAdmin, "InitialiserAdmin");
    const txAjouterFiliere = await courseArchive.ajouterFiliere(filiere, { from: admin });
    await enregistrerUtilisationGas(txAjouterFiliere, "AjouterFiliere");
  });

  describe("Tests essentiels", () => {
    it("devrait initialiser l'administrateur correctement", async () => {
      const roleAdmin = await courseArchive.rolesUtilisateurs(admin);
      expect(roleAdmin.toString()).to.equal("3");
      const nomAdmin = await courseArchive.nomsUtilisateurs(admin);
      expect(nomAdmin).to.equal("Administrateur");
    });

    it("devrait définir un enseignant et un étudiant avec succès", async () => {
      const txDefinirEnseignant = await courseArchive.definirRole([enseignant], 1, "Nom Enseignant", "", { from: admin });
      await enregistrerUtilisationGas(txDefinirEnseignant, "DefinirRole (Enseignant)");
      const roleEnseignant = await courseArchive.rolesUtilisateurs(enseignant);
      expect(roleEnseignant.toString()).to.equal("1");
      const txDefinirEtudiant = await courseArchive.definirRole([etudiant], 2, "", filiere, { from: admin });
      await enregistrerUtilisationGas(txDefinirEtudiant, "DefinirRole (Etudiant)");
      const roleEtudiant = await courseArchive.rolesUtilisateurs(etudiant);
      expect(roleEtudiant.toString()).to.equal("2");
    });

    it("devrait déposer un cours avec succès", async () => {
      await courseArchive.definirRole([enseignant], 1, "Nom Enseignant", "", { from: admin });
      const txDeposer = await courseArchive.deposerCours("Cours Test", hachageIPFSMock, true, filiere, { from: enseignant });
      await enregistrerUtilisationGas(txDeposer, "DeposerCours");
      const cours = await courseArchive.cours(1);
      expect(cours.titre).to.equal("Cours Test");
      expect(cours.hachageIPFS).to.equal(hachageIPFSMock);
    });

    it("devrait modifier un cours avec succès", async () => {
      await courseArchive.definirRole([enseignant], 1, "Nom Enseignant", "", { from: admin });
      await courseArchive.deposerCours("Cours Test", hachageIPFSMock, true, filiere, { from: enseignant });
      const txModifier = await courseArchive.modifierCours(1, "Cours Mis à Jour", "QmNewHash", false, filiere, { from: enseignant });
      await enregistrerUtilisationGas(txModifier, "ModifierCours");
      const cours = await courseArchive.cours(1);
      expect(cours.titre).to.equal("Cours Mis à Jour");
      expect(cours.estPublic).to.be.false;
    });

    it("devrait ajouter une autorisation et vérifier l'accès", async () => {
      await courseArchive.definirRole([enseignant], 1, "Nom Enseignant", "", { from: admin });
      await courseArchive.deposerCours("Cours Privé", hachageIPFSMock, false, filiere, { from: enseignant });
      const txAjouterAuth = await courseArchive.ajouterAutorisationCours(1, etudiant, { from: enseignant });
      await enregistrerUtilisationGas(txAjouterAuth, "AjouterAutorisationCours");
      const estAutorise = await courseArchive.coursAutorisations(1, etudiant);
      expect(estAutorise).to.be.true;
      const cours = await courseArchive.obtenirCours(1, { from: etudiant });
      expect(cours[0]).to.equal("Cours Privé");
    });

    it("devrait échouer à accéder à un cours sans autorisation", async () => {
      await courseArchive.definirRole([enseignant], 1, "Nom Enseignant", "", { from: admin });
      await courseArchive.deposerCours("Cours Privé", hachageIPFSMock, false, filiere, { from: enseignant });
      try {
        await courseArchive.obtenirCours(1, { from: utilisateurNonAutorise });
        expect.fail("Devrait avoir échoué");
      } catch (erreur) {
        expect(erreur.message).to.include("Vous n'etes pas autorise a acceder a ce cours");
      }
    });

    it("devrait supprimer un cours avec succès", async () => {
      await courseArchive.definirRole([enseignant], 1, "Nom Enseignant", "", { from: admin });
      await courseArchive.deposerCours("Cours Test", hachageIPFSMock, true, filiere, { from: enseignant });
      const txSupprimer = await courseArchive.supprimerCours(1, { from: enseignant });
      await enregistrerUtilisationGas(txSupprimer, "SupprimerCours");
      try {
        await courseArchive.obtenirCours(1, { from: admin });
        expect.fail("Devrait avoir échoué");
      } catch (erreur) {
        expect(erreur.message).to.include("Le cours n'existe pas");
      }
    });

    it("devrait supprimer une filière non assignée avec succès", async () => {
      const txAjouterFiliere = await courseArchive.ajouterFiliere("FiliereTest", { from: admin });
      await enregistrerUtilisationGas(txAjouterFiliere, "AjouterFiliere (FiliereTest)");
      const txSupprimerFiliere = await courseArchive.supprimerFiliere("FiliereTest", { from: admin });
      await enregistrerUtilisationGas(txSupprimerFiliere, "SupprimerFiliere");
      const filieres = await courseArchive.obtenirFilieres();
      expect(filieres).to.not.include("FiliereTest");
    });
  });
});