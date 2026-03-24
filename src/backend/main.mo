import Map "mo:core/Map";
import Time "mo:core/Time";
import List "mo:core/List";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";

import Storage "blob-storage/Storage";


actor {
  type UserId = Text;

  public type PaymentRecord = {
    id : Text;
    userId : Principal;
    amount : Nat; // Amount in the smallest currency unit (e.g., cents)
    timestamp : Int;
    upiRef : Text;
  };

  public type UserProfile = {
    name : Text;
    isPremium : Bool;
  };

  module Scan {
    public type Id = Text;
    public type Update = {
      name : ?Text;
      blobId : ?Text;
      sizeBytes : ?Nat;
      timestamp : ?Int;
    };
    public type Payload = {
      name : Text;
      blobId : Text;
      sizeBytes : Nat;
    };
    public type Entry = {
      id : Id;
      name : Text;
      blobId : Text;
      sizeBytes : Nat;
      timestamp : Int;
    };
    public func compare(scan1 : Entry, scan2 : Entry) : Order.Order {
      Int.compare(scan2.timestamp, scan1.timestamp);
    };
  };

  module Ad {
    public type Id = Nat;
    public type Payload = {
      title : Text;
      imageUrl : Text;
      linkUrl : Text;
      isActive : Bool;
    };
    public type Entry = {
      id : Id;
      title : Text;
      imageUrl : Text;
      linkUrl : Text;
      isActive : Bool;
    };
    public func compare(ad1 : Entry, ad2 : Entry) : Order.Order {
      Nat.compare(ad2.id, ad1.id);
    };
  };

  module Template {
    public type Id = Nat;
    public type Payload = {
      name : Text;
      description : Text;
      overlayImageUrl : Text;
      isActive : Bool;
    };
    public type Entry = {
      id : Id;
      name : Text;
      description : Text;
      overlayImageUrl : Text;
      isActive : Bool;
    };
    public func compare(template1 : Entry, template2 : Entry) : Order.Order {
      Nat.compare(template2.id, template1.id);
    };
  };

  var nextAdId = 1;
  var nextTemplateId = 1;

  let userScans = Map.empty<UserId, List.List<Scan.Entry>>();
  let ads = Map.empty<Ad.Id, Ad.Entry>();
  let templates = Map.empty<Template.Id, Template.Entry>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let payments = Map.empty<Text, PaymentRecord>();

  func getUserScansList(userId : UserId) : List.List<Scan.Entry> {
    switch (userScans.get(userId)) {
      case (null) { Runtime.trap("User not found") };
      case (?scans) { scans };
    };
  };

  // 1. Scan Management
  func addScan(userId : UserId, scan : Scan.Entry) {
    let scans = switch (userScans.get(userId)) {
      case (null) {
        let newScans = List.empty<Scan.Entry>();
        userScans.add(userId, newScans);
        newScans;
      };
      case (?existingScans) { existingScans };
    };
    scans.add(scan);
  };

  func removeScan(userId : UserId, scanId : Scan.Id) {
    let scans = getUserScansList(userId);
    let filteredScans = scans.filter(func(s) { s.id != scanId });
    userScans.add(userId, filteredScans);
  };

  func updateScanEntry(scan : Scan.Entry, updates : Scan.Update) : Scan.Entry {
    {
      id = scan.id;
      name = switch (updates.name) {
        case (null) { scan.name };
        case (?name) { name };
      };
      blobId = switch (updates.blobId) {
        case (null) { scan.blobId };
        case (?blobId) { blobId };
      };
      sizeBytes = switch (updates.sizeBytes) {
        case (null) { scan.sizeBytes };
        case (?sizeBytes) { sizeBytes };
      };
      timestamp = switch (updates.timestamp) {
        case (null) { scan.timestamp };
        case (?timestamp) { timestamp };
      };
    };
  };

  // 2. Admin-Only: Ads Management
  // 3. Admin-Only: Templates Management (Similar to Ads)
  func getAd(id : Ad.Id) : Ad.Entry {
    switch (ads.get(id)) {
      case (null) { Runtime.trap("Ad not found") };
      case (?ad) { ad };
    };
  };

  func getTemplate(id : Template.Id) : Template.Entry {
    switch (templates.get(id)) {
      case (null) { Runtime.trap("Template not found") };
      case (?template) { template };
    };
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // Premium Features
  public shared ({ caller }) func markCallerPremium(amount : Nat, upiRef : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upgrade to premium");
    };

    let paymentId = Time.now().toText();
    let payment = {
      id = paymentId;
      userId = caller;
      amount;
      timestamp = Time.now();
      upiRef;
    };
    payments.add(paymentId, payment);

    let existingProfile = switch (userProfiles.get(caller)) {
      case (null) {
        { name = "Unnamed"; isPremium = true };
      };
      case (?profile) {
        { profile with isPremium = true };
      };
    };

    userProfiles.add(caller, existingProfile);
  };

  public query ({ caller }) func getCallerPremiumStatus() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check premium status");
    };
    switch (userProfiles.get(caller)) {
      case (null) { false };
      case (?profile) { profile.isPremium };
    };
  };

  public query ({ caller }) func listCallerPayments() : async [PaymentRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list payments");
    };
    payments.values().toArray().filter(
      func(payment) {
        payment.userId == caller;
      }
    );
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Scan Management - User authenticated operations
  public shared ({ caller }) func saveScan(payload : Scan.Payload) : async Scan.Entry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save scans");
    };
    let isPremium = switch (userProfiles.get(caller)) {
      case (null) { false };
      case (?profile) { profile.isPremium };
    };

    let scanCount = switch (userScans.get(caller.toText())) {
      case (null) { 0 };
      case (?scans) { scans.size() };
    };

    if (not isPremium and scanCount >= 5) {
      Runtime.trap("Free users are limited to 5 scans. Upgrade to premium for unlimited scans!");
    };

    let scan : Scan.Entry = {
      id = Time.now().toText();
      name = payload.name;
      blobId = payload.blobId;
      sizeBytes = payload.sizeBytes;
      timestamp = Time.now();
    };
    addScan(caller.toText(), scan);
    scan;
  };

  public query ({ caller }) func getScan(scanId : Scan.Id) : async Scan.Entry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access scans");
    };
    switch (userScans.get(caller.toText())) {
      case (null) { Runtime.trap("User has no scans") };
      case (?scans) {
        switch (scans.find(func(scan) { scan.id == scanId })) {
          case (null) { Runtime.trap("Scan not found") };
          case (?scan) { scan };
        };
      };
    };
  };

  public shared ({ caller }) func updateScan(scanId : Scan.Id, updates : Scan.Update) : async Scan.Entry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update scans");
    };
    let scans = getUserScansList(caller.toText());
    switch (scans.find(func(s) { s.id == scanId })) {
      case (null) { Runtime.trap("Scan not found") };
      case (?existingScan) {
        let updatedScan = updateScanEntry(existingScan, updates);
        scans.filter(func(s) { s.id != scanId }).add(updatedScan);
        updatedScan;
      };
    };
  };

  public shared ({ caller }) func deleteScan(scanId : Scan.Id) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete scans");
    };
    removeScan(caller.toText(), scanId);
  };

  public query ({ caller }) func listScans() : async [Scan.Entry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list scans");
    };
    switch (userScans.get(caller.toText())) {
      case (null) { [] };
      case (?scans) { scans.toArray().sort() };
    };
  };

  // Public queries - no authentication required
  public query ({ caller }) func listActiveAds() : async [Ad.Entry] {
    ads.values().toArray().filter(func(ad) { ad.isActive }).sort();
  };

  public query ({ caller }) func listActiveTemplates() : async [Template.Entry] {
    templates.values().toArray().filter(func(template) { template.isActive }).sort();
  };

  // Admin-only functions - Ads
  public shared ({ caller }) func createAd(payload : Ad.Payload) : async Ad.Entry {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create ads");
    };
    let id = nextAdId;
    nextAdId += 1;
    let ad : Ad.Entry = {
      id;
      title = payload.title;
      imageUrl = payload.imageUrl;
      linkUrl = payload.linkUrl;
      isActive = payload.isActive;
    };
    ads.add(id, ad);
    ad;
  };

  public shared ({ caller }) func updateAd(id : Ad.Id, payload : Ad.Payload) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update ads");
    };
    let existingAd = getAd(id);
    let ad : Ad.Entry = {
      id = existingAd.id;
      title = payload.title;
      imageUrl = payload.imageUrl;
      linkUrl = payload.linkUrl;
      isActive = payload.isActive;
    };
    ads.add(id, ad);
  };

  public shared ({ caller }) func deleteAd(id : Ad.Id) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete ads");
    };
    ads.remove(id);
  };

  public query ({ caller }) func listAds() : async [Ad.Entry] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list all ads");
    };
    ads.values().toArray().sort();
  };

  // Admin-only functions - Templates
  public shared ({ caller }) func createTemplate(payload : Template.Payload) : async Template.Entry {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create templates");
    };
    let id = nextTemplateId;
    nextTemplateId += 1;
    let template : Template.Entry = {
      id;
      name = payload.name;
      description = payload.description;
      overlayImageUrl = payload.overlayImageUrl;
      isActive = payload.isActive;
    };
    templates.add(id, template);
    template;
  };

  public shared ({ caller }) func updateTemplate(id : Template.Id, payload : Template.Payload) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update templates");
    };
    let existingTemplate = getTemplate(id);
    let template : Template.Entry = {
      id = existingTemplate.id;
      name = payload.name;
      description = payload.description;
      overlayImageUrl = payload.overlayImageUrl;
      isActive = payload.isActive;
    };
    templates.add(id, template);
  };

  public shared ({ caller }) func deleteTemplate(id : Template.Id) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete templates");
    };
    templates.remove(id);
  };

  public query ({ caller }) func listTemplates() : async [Template.Entry] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list all templates");
    };
    templates.values().toArray().sort();
  };
};
