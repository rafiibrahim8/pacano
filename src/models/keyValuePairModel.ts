import { Sequelize, Model, DataTypes } from 'sequelize';
import { KeyValuePair } from '../types';

class KeyValuePairModel extends Model<KeyValuePair> implements KeyValuePair {
  public key!: string;
  public value!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

const defineKeyValuePairModel = (sequelize: Sequelize): void => {
  KeyValuePairModel.init(
    {
      key: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      value: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'key_value_pairs',
    },
  );
};

export { KeyValuePairModel, defineKeyValuePairModel };
