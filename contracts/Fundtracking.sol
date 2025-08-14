// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FundTracking {
    event ProjectCreated(uint256 indexed projectId, string name, address indexed owner);
    event DonationReceived(uint256 indexed projectId, address indexed donor, uint256 amount);
    event MilestoneApproved(uint256 indexed projectId, uint256 indexed milestoneId, address indexed voter);
    event FundsReleased(uint256 indexed projectId, uint256 indexed milestoneId, uint256 amount);

    struct Milestone {
        string description;
        uint256 amount; // in wei
        uint256 votes;
        bool approved;
        bool fundsReleased;
    }

    struct Project {
        string name;
        address owner;
        address[] stakeholders;
        mapping(address => bool) isStakeholder;
        Milestone[] milestones;
        uint256 totalRaised;
        uint256 releasedFunds;
    }

    Project[] public projects;
    uint256 public nextProjectId = 0;

    modifier onlyStakeholder(uint256 _projectId) {
        require(projects[_projectId].isStakeholder[msg.sender], "Not a stakeholder");
        _;
    }

    function createProject(
        string memory _name,
        address _owner,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestoneAmounts,
        address[] memory _stakeholders
    ) public {
        uint256 projectId = nextProjectId;
        nextProjectId++;
        Project storage newProject = projects.push();
        newProject.name = _name;
        newProject.owner = _owner;
        newProject.stakeholders = _stakeholders;
        for (uint256 i = 0; i < _stakeholders.length; i++) {
            newProject.isStakeholder[_stakeholders[i]] = true;
        }
        for (uint256 i = 0; i < _milestoneDescriptions.length; i++) {
            newProject.milestones.push(Milestone({
                description: _milestoneDescriptions[i],
                amount: _milestoneAmounts[i],
                votes: 0,
                approved: false,
                fundsReleased: false
            }));
        }
        emit ProjectCreated(projectId, _name, _owner);
    }

    function donate(uint256 _projectId) public payable {
        require(_projectId < projects.length, "Invalid project ID");
        require(msg.value > 0, "Donation amount must be greater than 0");
        projects[_projectId].totalRaised += msg.value;
        emit DonationReceived(_projectId, msg.sender, msg.value);
    }

    function voteMilestone(uint256 _projectId, uint256 _milestoneId) public onlyStakeholder(_projectId) {
        require(_projectId < projects.length, "Invalid project ID");
        require(_milestoneId < projects[_projectId].milestones.length, "Invalid milestone ID");
        require(!projects[_projectId].milestones[_milestoneId].approved, "Milestone already approved");
        projects[_projectId].milestones[_milestoneId].votes++;
        emit MilestoneApproved(_projectId, _milestoneId, msg.sender);
        if (projects[_projectId].milestones[_milestoneId].votes * 2 > projects[_projectId].stakeholders.length) {
            projects[_projectId].milestones[_milestoneId].approved = true;
            releaseFunds(_projectId, _milestoneId);
        }
    }

    function releaseFunds(uint256 _projectId, uint256 _milestoneId) private {
        Project storage project = projects[_projectId];
        Milestone storage milestone = project.milestones[_milestoneId];
        require(milestone.approved, "Milestone not approved yet");
        require(!milestone.fundsReleased, "Funds already released");
        uint256 amountToRelease = milestone.amount;
        require(address(this).balance >= amountToRelease, "Contract has insufficient funds");
        require(project.totalRaised - project.releasedFunds >= amountToRelease, "Project has insufficient funds");
        (bool success, ) = project.owner.call{value: amountToRelease}("");
        require(success, "Failed to send funds to project owner");
        milestone.fundsReleased = true;
        project.releasedFunds += amountToRelease;
        emit FundsReleased(_projectId, _milestoneId, amountToRelease);
    }

    function getProjectsCount() public view returns (uint256) {
        return projects.length;
    }

    function getProjectDetails(uint256 _projectId) public view returns (
        string memory name,
        address owner,
        address[] memory stakeholders,
        uint256 totalRaised,
        uint256 releasedFunds,
        Milestone[] memory milestones
    ) {
        require(_projectId < projects.length, "Invalid project ID");
        Project storage project = projects[_projectId];
        return (
            project.name,
            project.owner,
            project.stakeholders,
            project.totalRaised,
            project.releasedFunds,
            project.milestones
        );
    }
}