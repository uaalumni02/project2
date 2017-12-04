CREATE DATABASE IF NOT EXISTS barbershop;
USE barbershop;
DROP TABLE IF EXISTS Products;

CREATE TABLE Products (
    ItemId int(11) AUTO_INCREMENT NOT NULL,
    ProductName varchar(100) NOT NULL,
    StockQuantity  int NOT NULL, 
    PRIMARY KEY (ItemId)
);

INSERT INTO Products (ItemId, ProductName, StockQuantity)
VALUES (1, 'Shampoo', 210);

INSERT INTO Products (ItemId, ProductName, StockQuantity)
VALUES (2, 'Conditioner', 219);

INSERT INTO Products (ItemId, ProductName, StockQuantity)
VALUES (3, 'Brushes', 319);

INSERT INTO Products (ItemId, ProductName, StockQuantity)
VALUES (4 ,'Sponges', 110);



