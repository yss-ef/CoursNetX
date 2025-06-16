const CourseArchive = artifacts.require("CourseArchive");

module.exports = async function (deployer) {
  await deployer.deploy(CourseArchive);
  const instance = await CourseArchive.deployed();
  await instance.initialiserAdmin();
  console.log("CourseArchive déployé à :", instance.address);
  console.log("Administrateur initialisé à :", await instance.ADMIN_ADDRESS());
};