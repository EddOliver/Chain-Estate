// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PropertyToken is ERC1155, Ownable, ReentrancyGuard {
    // Constants
    string public constant COLLECTION_URI =
        "https://ipfs.io/ipfs/QmQ9Ggqy9VjYjvofYwKQ6xxQLxMBRXpRNTnTMLF8iDiHCP";

    // Libraries
    using Counters for Counters.Counter;

    // Variables
    Counters.Counter private propertyCounter;

    // Structs

    struct Property {
        uint256 fractionAmount;
        uint256 pricePerFraction;
        string contentId;
        bool isPublic;
    }

    struct ApprovedSale {
        uint256 propertyId;
        uint256 saleableFractions;
    }

    // URI Mappings
    mapping(uint256 => Property) public properties;
    mapping(address => ApprovedSale[]) public saleableFractionsMap;

    // Constructor

    constructor()
        ERC1155(COLLECTION_URI)
        Ownable(msg.sender)
        ReentrancyGuard()
    {}

    // Events
    event PropertyMinted(uint256 indexed propertyId);
    event FractionSold(
        uint256 indexed propertyId,
        address indexed seller,
        address indexed buyer,
        uint256 fractionAmount
    );

    // User Functions

    function approveForSale(uint256 _propertyId, uint256 _fractionCount)
        public
        nonReentrant
    {
        require(balanceOf(msg.sender, _propertyId) > 0, "Insufficient balance");
        require(
            balanceOf(msg.sender, _propertyId) >= _fractionCount,
            "Not enough fractions to approve sale"
        );
        _updateSaleableFractions(msg.sender, _propertyId, _fractionCount);
    }

    function sellFraction(
        address _seller,
        address _buyer,
        uint256 _propertyId,
        uint256 _fractionCount
    ) public payable nonReentrant {
        require(properties[_propertyId].isPublic, "Property is not public");
        require(
            _fractionCount > 0,
            "Fraction amount must be greater than zero"
        );
        require(
            _fractionCount <= balanceOf(_seller, _propertyId),
            "Seller lacks sufficient fractions"
        );
        require(
            _getSaleableFractions(_seller, _propertyId) >= _fractionCount,
            "Insufficient saleable fractions"
        );

        uint256 totalPrice = properties[_propertyId].pricePerFraction *
            _fractionCount;
        require(msg.value >= totalPrice, "Insufficient Funds to sent");

        payable(_seller).transfer(totalPrice);

        if (msg.value > totalPrice) {
            payable(_buyer).transfer(msg.value - totalPrice);
        }

        _safeTransferFrom(_seller, _buyer, _propertyId, _fractionCount, "");
        _updateSaleableFractions(
            _seller,
            _propertyId,
            _getSaleableFractions(_seller, _propertyId) - _fractionCount
        );
        _updateSaleableFractions(_buyer, _propertyId, 0);

        emit FractionSold(_propertyId, _seller, _buyer, _fractionCount);
    }

    // Admin Functions
    function mintProperty(
        address _recipient,
        uint256 _fractionCount,
        uint256 _initialPricePerFraction,
        string memory _contentId,
        bool _isPublic
    ) public onlyOwner nonReentrant {
        require(_fractionCount > 0, "Fraction count must be greater than zero");
        require(
            _initialPricePerFraction > 0,
            "Price must be greater than zero"
        );

        properties[propertyCounter.current()] = Property({
            fractionAmount: _fractionCount,
            pricePerFraction: _initialPricePerFraction,
            contentId: _contentId,
            isPublic: _isPublic
        });

        _updateSaleableFractions(_recipient, propertyCounter.current(), 0);
        _mint(_recipient, propertyCounter.current(), _fractionCount, "");
        propertyCounter.increment();
        emit PropertyMinted(propertyCounter.current() - 1);
    }

    function updateProperty(
        uint256 _propertyId,
        uint256 _fractionCount,
        uint256 _pricePerFraction,
        string memory _contentId,
        bool _isPublic
    ) public onlyOwner {
        properties[_propertyId] = Property({
            fractionAmount: _fractionCount,
            pricePerFraction: _pricePerFraction,
            contentId: _contentId,
            isPublic: _isPublic
        });
    }

    function togglePublicStatus(uint256 _propertyId) public onlyOwner {
        properties[_propertyId].isPublic = !properties[_propertyId].isPublic;
    }

    // Public Utility Functions

    function uri(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        return
            string(
                abi.encodePacked(
                    "https://ipfs.io/ipfs/",
                    properties[_tokenId].contentId
                )
            );
    }

    function calculateCost(uint256 propertyId, uint256 fractionCount)
        public
        view
        returns (uint256)
    {
        return (properties[propertyId].pricePerFraction * fractionCount);
    }

    // Private Utility Functions
    function _updateSaleableFractions(
        address _owner,
        uint256 _propertyId,
        uint256 _fractionCount
    ) internal {
        ApprovedSale[] storage ownerSales = saleableFractionsMap[_owner];
        bool exists = false;

        for (uint256 i = 0; i < ownerSales.length; i++) {
            if (ownerSales[i].propertyId == _propertyId) {
                ownerSales[i].saleableFractions = _fractionCount;
                exists = true;
                break;
            }
        }

        if (!exists) {
            ownerSales.push(
                ApprovedSale({
                    propertyId: _propertyId,
                    saleableFractions: _fractionCount
                })
            );
        }
    }

    function _getSaleableFractions(address _owner, uint256 _propertyId)
        internal
        view
        returns (uint256)
    {
        ApprovedSale[] storage sales = saleableFractionsMap[_owner];
        for (uint256 i = 0; i < sales.length; i++) {
            if (sales[i].propertyId == _propertyId) {
                return sales[i].saleableFractions;
            }
        }
        return 0;
    }
}


// y tu culo jai
