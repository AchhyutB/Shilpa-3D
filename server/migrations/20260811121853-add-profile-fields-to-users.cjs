'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'name', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('Users', 'language', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'English',
    });

    await queryInterface.addColumn('Users', 'country', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Users', 'quality', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'Standard',
    });

    await queryInterface.addColumn('Users', 'default_reconstruction', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'Gaussian Splat',
    });

    await queryInterface.addColumn('Users', 'avatar_filename', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'name');
    await queryInterface.removeColumn('Users', 'language');
    await queryInterface.removeColumn('Users', 'country');
    await queryInterface.removeColumn('Users', 'quality');
    await queryInterface.removeColumn('Users', 'default_reconstruction');
    await queryInterface.removeColumn('Users', 'avatar_filename');
  },
};