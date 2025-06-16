module.exports = {
  networks: {
    ganache: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*"
    }
  },
  compilers: {
    solc: {
      version: "0.8.0",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200 // Low value to prioritize code size reduction
        }
      }
    }
  },
  mocha: {
    timeout: 1000000000
  }
};