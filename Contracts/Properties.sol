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
        "https://greenfield-sp.defibit.io/view/chain-estate/metadata.json";

    // Libraries
    using Counters for Counters.Counter;
    using Strings for uint256;

    // Variables
    Counters.Counter private propertyCounter;
    uint256 public propertiesMinted = 0;

    // Structs

    struct Property {
        uint256 tokenId;
        uint256 fractionAmount;
        uint256 pricePerFraction;
        bool isPublic;
    }

    struct ApprovedSale {
        uint256 propertyId;
        uint256 saleableFractions;
    }

    // URI Mappings
    mapping(uint256 => Property) public properties;
    mapping(uint256 => address[]) public owners;
    mapping(address => ApprovedSale[]) public saleableFractionsMap;

    // Constructor

    constructor()
        ERC1155(COLLECTION_URI)
        Ownable(msg.sender)
        ReentrancyGuard()
    {}

    // Events
    event PropertyMinted(uint256 indexed propertyId, address indexed minter);
    event FractionSold(
        uint256 indexed propertyId,
        address indexed seller,
        address indexed buyer,
        uint256 fractionAmount
    );

    // User Functions

    function mergeTokens(
        uint256[] memory _tokenIds,
        uint256[] memory _amounts,
        uint256 _fractionCount
    ) public nonReentrant {
        bool _continue = true;
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            if (balanceOf(msg.sender, _tokenIds[i]) >= _amounts[i]) {
                continue;
            } else {
                _continue = false;
            }
        }
        require(_continue);
        uint256 value = 0;
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            value += calculateCost(_tokenIds[i], _amounts[i]);
        }
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            _burn(msg.sender, _tokenIds[i], _amounts[i]);
            Property storage temp = properties[_tokenIds[i]];
            _updateProperty(
                _tokenIds[i],
                temp.fractionAmount - _amounts[i],
                temp.pricePerFraction,
                temp.isPublic
            );
        }
        properties[propertyCounter.current()] = Property({
            fractionAmount: _fractionCount,
            pricePerFraction: value / _fractionCount,
            isPublic: true,
            tokenId: propertyCounter.current()
        });
        owners[propertyCounter.current()] = [msg.sender];
        _updateSaleableFractions(msg.sender, propertyCounter.current(), 0);
        _mint(msg.sender, propertyCounter.current(), _fractionCount, "");
        propertyCounter.increment();
        propertiesMinted = propertyCounter.current();
        emit PropertyMinted(propertyCounter.current() - 1, msg.sender);
    }

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
        _updateOwners(_buyer, _propertyId);
        emit FractionSold(_propertyId, _seller, _buyer, _fractionCount);
    }

    // Admin Functions
    function mintProperty(
        address _recipient,
        uint256 _fractionCount,
        uint256 _initialPricePerFraction,
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
            isPublic: _isPublic,
            tokenId: propertyCounter.current()
        });
        owners[propertyCounter.current()] = [_recipient];
        _updateSaleableFractions(_recipient, propertyCounter.current(), 0);
        _mint(_recipient, propertyCounter.current(), _fractionCount, "");
        propertyCounter.increment();
        propertiesMinted = propertyCounter.current();
        emit PropertyMinted(propertyCounter.current() - 1, _recipient);
    }

    function updateProperty(
        uint256 _propertyId,
        uint256 _fractionCount,
        uint256 _pricePerFraction,
        bool _isPublic
    ) public onlyOwner {
        properties[_propertyId] = Property({
            fractionAmount: _fractionCount,
            pricePerFraction: _pricePerFraction,
            isPublic: _isPublic,
            tokenId: _propertyId
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
                    "https://greenfield-sp.defibit.io/view/chain-estate/properties/",
                    properties[_tokenId].tokenId.toString(),
                    "/metadata.json"
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

    function _updateOwners(address _owner, uint256 _propertyId) internal {
        bool exists = false;
        for (uint256 i = 0; i < owners[_propertyId].length; i++) {
            if (owners[_propertyId][i] == _owner) {
                exists = true;
            }
        }
        if (!exists) {
            owners[_propertyId].push(_owner);
        }
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

    function _updateProperty(
        uint256 _propertyId,
        uint256 _fractionCount,
        uint256 _pricePerFraction,
        bool _isPublic
    ) internal {
        properties[_propertyId] = Property({
            fractionAmount: _fractionCount,
            pricePerFraction: _pricePerFraction,
            isPublic: _isPublic,
            tokenId: _propertyId
        });
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
